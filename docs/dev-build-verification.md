# TERRI Dev Build / 実機検証手順

## 前提

Native地図は `@maplibre/maplibre-react-native` を使うため、Expo Goでは検証できない。iOS/Androidはdev buildまたはprebuild後のnative実行で確認する。

local Supabaseは `apps/mobile/.env` で次を使う。

```text
EXPO_PUBLIC_TERRI_DATA_SOURCE=supabase
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase status の Publishable key>
EXPO_PUBLIC_MAP_ENV=development
EXPO_PUBLIC_MAP_TILE_MODE=dev-osm-raster
EXPO_PUBLIC_MAP_STYLE_URL=
EXPO_PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors
EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES=true
```

`127.0.0.1` はiOS Simulator中心の設定。Android Emulatorでは `10.0.2.2`、実機ではMacのLAN IPまたはremote Supabaseを使う。

## 事前確認

```bash
supabase status
pnpm --filter @terri/mobile typecheck
pnpm --filter @terri/mobile test
pnpm --filter @terri/mobile exec expo config --type introspect
pnpm --filter @terri/mobile prebuild -- --platform ios
pnpm --filter @terri/mobile prebuild -- --platform android
```

確認点:

- `@maplibre/maplibre-react-native` pluginが含まれる
- iOS `bundleIdentifier` が `app.terri.mobile`
- Android `package` が `app.terri.mobile`
- iOS `NSLocationWhenInUseUsageDescription` が日本語文言になっている
- Android `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` が含まれる
- `expo-system-ui` が入っており、Android `userInterfaceStyle` 警告が出ない

## iOS dev build

```bash
pnpm --filter @terri/mobile prebuild -- --platform ios
pnpm --filter @terri/mobile ios:dev
```

Debug/dev buildはJS bundleをアプリに埋め込まず、起動時にMetroから読み込む。実機がMacと同じWi-Fiにいない、またはMetroを起動していない状態で開くと、次のエラーになる。

```text
No script URL provided. Make sure the packager is running or you have embedded a JS bundle in your application bundle.
```

同じWi-FiやMetroに依存しない実機インストールをしたい場合は、Release構成でビルドする。

```bash
pnpm --filter @terri/mobile prebuild -- --platform ios
pnpm --filter @terri/mobile ios:release:device
```

Release構成では `main.jsbundle` がアプリ内に埋め込まれるため、Metro不要で起動できる。実機でlocal Supabaseを使う場合は、`127.0.0.1` ではなくMacのLAN IPまたはremote Supabaseを `.env` に設定してからビルドする。self-hosted map style未設定の検証ビルドでは `EXPO_PUBLIC_MAP_ENV=development` のままにする。

`xcodebuild` が次のように失敗する場合、JS bundleやTERRIのコードではなく、Xcode/CoreDeviceが実機を開発用デバイスとして準備できていない。

```text
Timed out waiting for all destinations matching the provided destination specifier to become available
The developer disk image could not be mounted on this device.
```

対応:

1. iPhoneのロックを解除し、Macを信頼する。
2. USBケーブルを抜き差しし、必要ならiPhoneとMacを再起動する。
3. Xcodeを開き、`Window > Devices and Simulators` で対象iPhoneを選び、Preparing/Developer Disk Imageの処理が終わるまで待つ。
4. Xcodeの `Settings > Platforms` で実機iOSに対応するiOS Platformが入っているか確認する。
5. 端末OSがXcodeより新しい場合は、Xcodeを端末OS対応版へ更新する。
6. 準備完了後、もう一度 `pnpm --filter @terri/mobile ios:release:device` を実行する。

## Android dev build

Android Emulatorでlocal Supabaseを見る場合は `.env` のURLを `http://10.0.2.2:54321` に変更してから起動する。

```bash
pnpm --filter @terri/mobile prebuild -- --platform android
pnpm --filter @terri/mobile android:dev
```

AndroidもMetroに依存しない実機インストールはRelease variantで行う。

```bash
pnpm --filter @terri/mobile prebuild -- --platform android
pnpm --filter @terri/mobile android:release
```

## 検証チェックリスト

- S04でMapLibre地図が表示される
- 地図上にattributionが常時表示される
- 現在地権限ダイアログが表示される
- 権限許可後、現在地ラベルと自分markerが表示される
- 領土化ONでGPS点が保存され、live previewが表示される
- STOP/確定後、final territoryが履歴と地図に出る
- 友達のfinal territoryが自分のlive previewと別レイヤーで表示される
- 友達Presenceが15秒間隔で更新される
- `location_sharing_enabled=false` で自分のPresenceが送信停止される
- 共有OFFの友達または非友達のPresenceを購読できない

## 既知の注意

- 本番用MapLibre style URL / tile基盤は未選定。dev/release構成の実機検証は `EXPO_PUBLIC_MAP_ENV=development`、`EXPO_PUBLIC_MAP_TILE_MODE=dev-osm-raster`、`EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES=true` の場合だけOSM raster fallbackで実地図を表示する。
- 配布・本番運用buildでは `EXPO_PUBLIC_MAP_ENV=production`、`EXPO_PUBLIC_MAP_TILE_MODE=self-hosted-vector`、`EXPO_PUBLIC_MAP_STYLE_URL=<self-hosted style JSON>`、`EXPO_PUBLIC_MAP_DEBUG_ALLOW_OSM_TILES=false` を設定し、`tile.openstreetmap.org` に依存しない。
- physical deviceでlocal Supabaseを使う場合、`127.0.0.1` は端末自身を指すため使えない。
- アプリアイコンは未設定。prebuild時の警告はdev buildを止めないが、配布前に `expo.icon` / adaptive iconを追加する。
- `expo-router@6.0.23` はExpo SDK 54推奨の `react-native-screens@~4.16.0` に固定する。推移依存で `4.24.x` へ上がるとiOS buildで `RNSBottomTabsScreenComponentView` 未定義エラーになる。
- remote Supabase反映は `SUPABASE_DB_PASSWORD` が必要。
