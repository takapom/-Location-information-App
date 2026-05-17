# TERRI UX/機能修正方針 Codex実装指示書

作成日: 2026-05-16  
対象: `apps/mobile`, `packages/shared`, 必要に応じて `docs/architecture.md` / `docs/adr-proposals`  
目的: 直近レビューで出たUX/機能課題を、Codexが実装しやすい順序・責務・テスト観点へ落とす。

---

## 0. Codexへの前提指示

実装前に必ず読むこと。

```text
AGENTS.md
.codex/skills/terri-design-principles/SKILL.md
.codex/skills/terri-frontend-architecture/SKILL.md
.codex/skills/terri-test-contracts/SKILL.md
docs/architecture.md
docs/adr/0011-closed-loop-territory-capture.md
```

この修正では、TERRIの根幹アルゴリズムを大きく変えない。優先するのは、既存の「閉じた移動ループだけをテリトリー面積として扱う」設計を、ユーザーが理解できるUIに翻訳すること。

守ること。

- 画面からSupabaseを直接呼ばない。`TerriRepository` を通す。
- `MapSurface` は描画境界として維持する。GPS取得、repository、Supabase処理を入れない。
- 確定済み陣地、live preview、未確定の軌跡線を混同しない。
- 友達ライブ現在地履歴をPostgresへ保存しない。
- 1機能ごとに、近いレイヤーへ成功パスと境界/失敗パスのテストを追加する。
- testIDは既存テストが依存しているものを不用意に削除しない。特に `finalize-territory-button`, `sync-territory-button`, `friends-search-button`, `invite-copy-button`, `map-surface` は維持する。

---

## 1. 現状の課題整理

### P0: 陣地化ルールが初見で分かりにくい

現行設計では、直線移動は軌跡として残るが、面積にはならない。任意の過去地点から500m以内に戻った閉じたループだけがテリトリー面積になる。

しかしUIコピーはまだ「歩いた分だけ、世界が自分のものになる」に寄っており、ユーザーは「歩いたのに面積が増えない」と感じやすい。

### P0: 常時LIVEモデルとSTOPボタンの意味が混ざっている

`useLiveTerritory` はアプリ起動後に常時テリトリー生成へ入る設計だが、`LiveTerritoryPanel` の確定ボタン表示はまだ `STOP` になっている。これは運動記録アプリのSTART/STOPモデルに見える。

### P1: プライバシー状態の表示が弱い

`MapScene.chrome.privacyLabel` は `FRIENDS ONLY` 固定に近い。プロフィール設定には `territoryCaptureEnabled` と `locationSharingEnabled` が分かれているため、マップ上でも次を分けて見せる必要がある。

```text
友達に共有中
領土化だけON
領土化OFF
位置情報OFF
確認中
```

### P1: 友達マーカーのタップ体験が足りない

地図上の友達アバターは存在するが、Zenly/Whoo寄りの「友達をタップした瞬間に小さなカードが出る」体験がまだ弱い。`MapFriendMarker` には `displayName`, `updatedLabel`, `totalAreaKm2`, `isActive` があるので、まずはこの情報だけでカード化できる。

### P1: シェアと招待の導線がまだ仮実装寄り

`CompleteSheet` は見た目としてシェアカード風だが、共有処理は文面共有が中心。`FriendsModal` の招待リンクは固定文字列なので、実際の友達追加導線として弱い。

---

## 2. 実装優先順位

```text
P0-1 ループ陣地化ルールのUX翻訳
P0-2 STOP表記を「今日を確定」系へ変更
P1-1 プライバシーピルを実状態表示へ変更
P1-2 友達マーカータップカード追加
P1-3 シェアカードPreviewの共通化と招待リンクの実データ化
P2-1 地図SDK/MapLibre復旧は別タスク化し、この修正では深追いしない
```

---

## 3. P0-1 ループ陣地化ルールのUX翻訳

### 目的

ユーザーが次を即理解できるようにする。

```text
歩く → 線が伸びる
囲む → 内側が塗られる
直線だけ → 面積にはならない
```

### 対象ファイル

```text
apps/mobile/app/onboarding.tsx
apps/mobile/src/features/map/components/LiveTerritoryPanel.tsx
apps/mobile/src/features/tracking/services/liveTerritoryState.ts
apps/mobile/src/features/map/__tests__/MapControls.test.tsx
apps/mobile/src/features/tracking/__tests__/liveTerritoryState.test.ts
```

必要に応じて追加する。

```text
apps/mobile/src/features/map/components/LoopCaptureHint.tsx
apps/mobile/src/features/map/__tests__/LoopCaptureHint.test.tsx
```

### 実装方針

#### 3.1 オンボーディングコピーを修正する

`apps/mobile/app/onboarding.tsx` のタイトル/サブタイトルを、閉じたループ前提に寄せる。

推奨コピー。

```text
タイトル:
ぐるっと囲んで
テリトリーを作ろう!

サブタイトル:
線を引いて、囲めた場所が自分の色になる
```

さらに、イラスト内またはタイトル下に短い3ステップを追加する。

```text
1. 歩くと線が伸びる
2. 戻って囲む
3. 内側がテリトリーになる
```

注意点。

- 「歩いた分だけ」を完全削除する必要はないが、初回説明では「囲むと面積になる」を優先する。
- 長い説明文にしない。Z世代向けに短く、視覚中心にする。

#### 3.2 live状態のガイダンス関数を追加する

`apps/mobile/src/features/tracking/services/liveTerritoryState.ts` に、UI用の純粋関数を追加する。

例。

```ts
export type LoopCaptureGuidance = {
  title: string;
  body: string;
  tone: "neutral" | "active" | "success" | "warning";
};

export function getLoopCaptureGuidance(input: {
  status: LiveTerritoryStatus;
  routePointCount: number;
  previewAreaKm2: number;
}): LoopCaptureGuidance {
  // permissionDenied/backgroundLimited/pausedByPrivacy/error は状態に応じた文言
  // routePointCount === 0: 「歩き始めると線が残る」
  // previewAreaKm2 === 0: 「線は記録中。囲むと面積になる」
  // previewAreaKm2 > 0: 「囲めた！今日のテリトリー +x.xxkm²」
}
```

`LiveTerritoryPanel` へ `routePointCount` または `hasTrackingRoute` を渡す必要がある。最小変更なら `LiveTerritoryPanelProps` に次を追加する。

```ts
routePointCount?: number;
```

`HomeMapScreen` からは `liveTerritory.state.trackingRoute.length` を渡す。

#### 3.3 `LiveTerritoryPanel` にガイダンス行を追加する

`LiveTerritoryPanel` のstats card下またはstats card内に、次のような短い文言を表示する。

```text
線は記録中。囲むと面積になる
囲めた！ +0.12 km²
直線は軌跡として残ります
```

UI要件。

- 面積0のときに「獲得できていない」印象を強めすぎない。
- `previewAreaKm2` が0でも、距離が増えているなら「軌跡は記録中」と肯定的に表現する。
- `status === "permissionDenied"` などは位置情報許可の説明を優先する。

### 受け入れ条件

- 初回オンボーディングで「囲むとテリトリーになる」が表示される。
- live中、閉じたループがない場合は「軌跡は記録中 / 囲むと面積になる」系の表示になる。
- live中、`previewAreaKm2 > 0` の場合は「囲めた」系の表示になる。
- 直線移動で面積が0でも、UI上は失敗のように見せない。
- `buildHomeMapScene` の既存挙動、つまり閉じたループがない場合は `livePreview` を出さず `trackingRoute` だけ渡す挙動を壊さない。

### 必須テスト

```text
apps/mobile/src/features/tracking/__tests__/liveTerritoryState.test.ts
  - routePointCount=0 / previewAreaKm2=0 / previewAreaKm2>0 の文言分岐
  - permissionDenied / pausedByPrivacy / error の文言分岐

apps/mobile/src/features/map/__tests__/MapControls.test.tsx
  - LiveTerritoryPanelがガイダンスを表示する
  - previewAreaKm2=0でも「囲む」説明が出る
  - previewAreaKm2>0で「囲めた」説明が出る
```

---

## 4. P0-2 STOP表記を「今日を確定」系へ変更

### 目的

常時LIVEモデルと操作名を一致させる。`STOP` はセッション型に見えるため、ユーザー向け文言を「保存/確定/結果を見る」へ寄せる。

### 対象ファイル

```text
apps/mobile/src/features/map/components/LiveTerritoryPanel.tsx
apps/mobile/src/features/map/__tests__/MapControls.test.tsx
apps/mobile/src/features/tracking/services/liveTerritoryState.ts
apps/mobile/src/features/tracking/__tests__/liveTerritoryState.test.ts
```

### 実装方針

`LiveTerritoryPanel` の確定ボタン文言を変更する。

現状。

```tsx
<Text style={styles.stopText}>{status === "finalizing" ? "確定中" : "STOP"}</Text>
```

推奨。

```tsx
<Text style={styles.stopText}>{getFinalizeButtonLabel(status)}</Text>
```

`liveTerritoryState.ts` に追加する。

```ts
export function getFinalizeButtonLabel(status: LiveTerritoryStatus) {
  if (status === "finalizing") return "確定中";
  if (status === "syncing") return "保存して結果を見る";
  return "今日を確定";
}
```

ボタン下に補助文を追加する場合のコピー。

```text
今日の線と囲めたテリトリーを結果カードにします
```

注意点。

- `finalize-territory-button` のtestIDは維持する。
- `onFinalize` の処理名は変えなくてよい。
- `useLiveTerritory.finalize()` の責務は変えない。
- `STOP` という文言だけを消す。内部のfinalize RPCはそのまま。

### 受け入れ条件

- live中のボタン文言が `STOP` ではない。
- 押下すると既存通り `repository.finalizeDailyActivity()` が1回だけ呼ばれる。
- `finalizing` 中は二重押下できない。
- 既存の完了シート表示は維持される。

### 必須テスト

```text
apps/mobile/src/features/tracking/__tests__/liveTerritoryState.test.ts
  - getFinalizeButtonLabel("live") が "今日を確定"
  - getFinalizeButtonLabel("syncing") が "保存して結果を見る"
  - getFinalizeButtonLabel("finalizing") が "確定中"

apps/mobile/src/features/map/__tests__/MapControls.test.tsx
  - LiveTerritoryPanelに STOP が含まれない
  - finalize-territory-button押下でonFinalizeが呼ばれる
```

---

## 5. P1-1 プライバシーピルを実状態表示へ変更

### 目的

マップ上で、ユーザーが「今、自分は友達に見えているか」「テリトリー生成だけONなのか」を理解できるようにする。

### 対象ファイル

```text
apps/mobile/src/components/map/scene/mapSceneTypes.ts
apps/mobile/src/components/map/chrome/MapChrome.tsx
apps/mobile/src/components/map/chrome/__tests__/MapChrome.test.tsx
apps/mobile/src/features/map/services/buildHomeMapScene.ts
apps/mobile/src/features/map/services/__tests__/buildHomeMapScene.test.ts
apps/mobile/src/features/map/components/HomeMapScreen.tsx
apps/mobile/src/features/tracking/services/liveTerritoryState.ts
```

### 実装方針

#### 5.1 `privacyLabel` の型を固定文字列から広げる

現状。

```ts
privacyLabel: "FRIENDS ONLY";
```

変更案。

```ts
export type MapPrivacyLabel =
  | "確認中"
  | "友達に共有中"
  | "領土化だけON"
  | "領土化OFF"
  | "位置情報OFF";

privacyLabel: MapPrivacyLabel;
```

または、過剰な型増加を避けたい場合は `privacyLabel: string` でもよい。ただしテストで期待値を固定する。

#### 5.2 privacy label生成関数を追加する

`liveTerritoryState.ts` または `buildHomeMapScene.ts` に純粋関数を置く。

推奨は `liveTerritoryState.ts`。

```ts
export function getMapPrivacyLabel(input: {
  profile?: Pick<UserProfile, "locationSharingEnabled" | "territoryCaptureEnabled">;
  status: LiveTerritoryStatus;
}) {
  if (input.status === "checkingPermission") return "確認中";
  if (input.status === "permissionDenied" || input.status === "backgroundLimited") return "位置情報OFF";
  if (!input.profile) return "確認中";
  if (!input.profile.territoryCaptureEnabled) return "領土化OFF";
  if (!input.profile.locationSharingEnabled) return "領土化だけON";
  return "友達に共有中";
}
```

`HomeMapScreen` 側で算出して `buildHomeMapScene` へ渡す。

```ts
const privacyLabel = getMapPrivacyLabel({
  profile,
  status: liveTerritory.state.status
});
```

`BuildHomeMapSceneInput` に `privacyLabel?: MapPrivacyLabel` を追加し、未指定時は既存互換として `"確認中"` または `"友達に共有中"` を使う。

### 受け入れ条件

- 共有ON + 領土化ONなら「友達に共有中」。
- 共有OFF + 領土化ONなら「領土化だけON」。
- 領土化OFFなら「領土化OFF」。
- 位置情報拒否なら「位置情報OFF」。
- `FRIENDS ONLY` 固定表示は残さない。

### 必須テスト

```text
apps/mobile/src/features/tracking/__tests__/liveTerritoryState.test.ts
  - getMapPrivacyLabelの全分岐

apps/mobile/src/components/map/chrome/__tests__/MapChrome.test.tsx
  - 渡したprivacyLabelをそのまま表示する

apps/mobile/src/features/map/services/__tests__/buildHomeMapScene.test.ts
  - privacyLabel inputがscene.chromeへ入る
```

---

## 6. P1-2 友達マーカータップカード追加

### 目的

Zenly寄りの「友達がそこにいる」体験を強化する。友達一覧を開かなくても、地図上の友達アバターをタップして情報を見られるようにする。

### 対象ファイル

```text
apps/mobile/src/components/map/mapTypes.ts
apps/mobile/src/components/map/scene/mapSceneTypes.ts
apps/mobile/src/components/map/MapSurface.native.tsx
apps/mobile/src/components/map/MapSurface.web.tsx
apps/mobile/src/features/map/components/HomeMapScreen.tsx
apps/mobile/src/features/map/components/HomeMapScreen.styles.ts
apps/mobile/src/features/map/__tests__/HomeMapScreenControls.test.tsx
apps/mobile/src/components/map/__tests__/MapSurface.native.test.tsx
```

必要に応じて追加。

```text
apps/mobile/src/features/map/components/FriendMapCard.tsx
apps/mobile/src/features/map/__tests__/FriendMapCard.test.tsx
```

### 実装方針

#### 6.1 `MapSurfaceProps` に友達タップcallbackを追加する

```ts
onFriendMarkerPress?: (friendId: string) => void;
```

`MapSurface.native.tsx` の友達 `Marker` に `onPress` を追加する。

```tsx
<Marker
  key={friend.id}
  identifier={`friend-${friend.id}`}
  coordinate={{ latitude: friend.latitude, longitude: friend.longitude }}
  onPress={() => props.onFriendMarkerPress?.(friend.id)}
>
```

Web側も可能な範囲で同じcallbackを呼ぶ。既存Web実装がDOM/Leaflet markerを作っている場合は、marker clickでcallbackを呼ぶ。

#### 6.2 HomeMapScreenで選択状態を持つ

```ts
const [selectedFriendId, setSelectedFriendId] = useState<string | undefined>();
const selectedFriend = homeMapScene.layers.friends.find((friend) => friend.id === selectedFriendId);
```

`MapSurface` へ渡す。

```tsx
<MapSurface
  scene={homeMapScene}
  onFriendMarkerPress={setSelectedFriendId}
/>
```

#### 6.3 `FriendMapCard` を追加する

表示内容。

```text
Avatar / displayName
updatedLabel
totalAreaKm2
isActiveなら「今アクティブ🔥」
閉じるボタン
```

コピー例。

```text
Sakura
今アクティブ🔥 / 2分前
1.2 km² 獲得中
```

注意点。

- 住所名や地名は現時点で無理に出さない。逆ジオコーディングを追加すると外部API/課金/プライバシー論点が増える。
- カードは地図ジェスチャーを全面的に奪わない。閉じる、カード自体のみタップ可能でよい。
- `MapSurface` 内部でrepositoryを呼ばない。

### 受け入れ条件

- 友達マーカーをタップすると友達カードが出る。
- カードに名前、更新状態、総獲得面積、アクティブ状態が出る。
- 閉じる操作でカードが消える。
- 友達が共有OFFまたは位置なしの場合は、そもそも地図マーカーに出ない既存挙動を維持する。

### 必須テスト

```text
apps/mobile/src/features/map/__tests__/FriendMapCard.test.tsx
  - 表示名、updatedLabel、面積、active badgeを表示する
  - close callbackを呼ぶ

apps/mobile/src/features/map/__tests__/HomeMapScreenControls.test.tsx
  - onFriendMarkerPressでFriendMapCardが表示される
  - closeで消える

apps/mobile/src/components/map/__tests__/MapSurface.native.test.tsx
  - friend marker pressでonFriendMarkerPress(friend.id)が呼ばれる
```

---

## 7. P1-3 シェアカードPreview共通化と招待リンク実データ化

### 目的

完了体験と友達追加導線を、仮実装からプロダクト導線へ近づける。

---

### 7.1 シェアカードPreviewを共通化する

#### 対象ファイル

```text
apps/mobile/src/features/map/components/CompleteSheet.tsx
apps/mobile/src/features/activities/components/ActivityDetailScreen.tsx
apps/mobile/src/features/activities/activityShare.ts
apps/mobile/src/features/activities/__tests__/activityShare.test.ts
apps/mobile/src/features/map/__tests__/MapControls.test.tsx
```

必要に応じて追加。

```text
apps/mobile/src/features/activities/components/TerritoryShareCard.tsx
apps/mobile/src/features/activities/__tests__/TerritoryShareCard.test.tsx
```

#### 実装方針

まずは画像生成ではなく、共通Previewコンポーネントと共有文面の品質を上げる。

```ts
export type TerritoryShareCardData = {
  title: string;
  createdAtLabel: string;
  distanceLabel: string;
  areaLabel: string;
  color: TerritoryColor;
};

export function buildTerritoryShareCardData(activity: TerritorySummary): TerritoryShareCardData;
```

`CompleteSheet` の現在の `shareMap` / `shareTerritory` 表示を `TerritoryShareCard` に寄せる。`ActivityDetailScreen` でも同じPreviewを使えるなら使う。

共有文面は次のようにする。

```text
TERRIで今日のテリトリーを確定: 5.7km / 1.23km²
囲んだ場所が自分の色になった 🗺
```

注意点。

- `km2` 表記はUIでは `km²` に統一する。
- 画像共有をこのPRで無理に実装しない。`react-native-view-shot` や `expo-sharing` を追加する場合は依存追加の影響があるため、別ADRまたは別タスクで扱う。
- `Share.share` のfallbackは維持する。

#### 受け入れ条件

- `CompleteSheet` の見た目はシェアカードとして維持される。
- 共有文面に `km²` と「確定」が入る。
- 失敗時のエラー表示は維持される。
- Activity detailとComplete sheetで共有文面ロジックが分散しない。

#### 必須テスト

```text
apps/mobile/src/features/activities/__tests__/activityShare.test.ts
  - buildTerritoryShareCardDataのformat
  - buildTerritoryShareMessageがkm²表記になる
  - shareTerritorySummaryがShare.shareへ新文面を渡す

apps/mobile/src/features/map/__tests__/MapControls.test.tsx
  - CompleteSheetにカードPreviewが表示される
  - 共有失敗時にエラー表示する既存挙動を維持する
```

---

### 7.2 招待リンクを固定文字列から実データへ寄せる

#### 対象ファイル

```text
packages/shared/src/index.ts
apps/mobile/src/lib/repositories/terriRepository.ts
apps/mobile/src/lib/repositories/mockTerriRepository.ts
apps/mobile/src/lib/supabase/supabaseTerriRepository.ts
apps/mobile/src/features/map/components/FriendsModal.tsx
apps/mobile/src/features/map/__tests__/MapControls.test.tsx
apps/mobile/src/lib/supabase/__tests__/supabaseTerriRepository.test.ts
```

#### 実装方針

最小実装では、`profiles.friend_code` を使って招待URLを作る。

`UserProfile` に `friendCode` を追加する。

```ts
export type UserProfile = {
  id: string;
  friendCode: string;
  name: string;
  initials: string;
  ...
};
```

`mockTerriRepository.initialProfile` に追加。

```ts
friendCode: "USER2026"
```

`supabaseTerriRepository` のprofile mapperで `friend_code` を読む。既存DBには `profiles.friend_code` があるため、新規migrationは不要な可能性が高い。

`FriendsModal` のpropsへ `currentUserFriendCode?: string` を追加するか、`HomeMapScreen` から `profile` を渡す。

推奨。

```ts
<FriendsModal
  friends={liveFriends}
  currentUserFriendCode={profile?.friendCode}
  onFriendsChange={setFriends}
  onClose={() => setOverlay("none")}
/>
```

招待URL生成関数を追加する。

```ts
export function buildInviteUrl(friendCode?: string) {
  if (!friendCode) return "";
  return `https://terri.app/invite/${encodeURIComponent(friendCode)}`;
}
```

本番ドメインが未確定なら、`.env` でbase URL化する。

```text
EXPO_PUBLIC_TERRI_INVITE_BASE_URL=https://terri.app/invite
```

ただし、env追加が大きい場合は `https://terri.app/invite` を定数にしてよい。後でADRまたはenv整備で変える。

#### 受け入れ条件

- `FriendsModal` に固定の `https://app.link/share...xyz` が残らない。
- 自分の `friendCode` を含む招待URLが表示される。
- friendCode未取得時は「プロフィール読込中」または「招待コードを読み込めませんでした」と表示し、空URLをコピーしない。
- コピー成功/失敗の最低限のUI feedbackを出す。

#### 必須テスト

```text
apps/mobile/src/features/map/__tests__/MapControls.test.tsx
  - currentUserFriendCodeから招待URLが表示される
  - invite-copy-buttonでそのURLがClipboardへ渡る
  - friendCode未取得時はコピーbuttonがdisabledまたはコピーしない

apps/mobile/src/lib/supabase/__tests__/supabaseTerriRepository.test.ts
  - getProfile mapperがfriend_codeをfriendCodeへ変換する

apps/mobile/src/lib/repositories/__tests__ または既存mock test
  - mock profileがfriendCodeを持つ
```

---

## 8. P2-1 地図SDK/MapLibre復旧は別タスク化する

この修正範囲では、Native MapSurfaceのMapLibre復旧や地図SDK再選定を主目的にしない。

理由。

- 現在のUX課題は、まずルール説明、STOP表記、プライバシー表示、友達タップ、共有導線で改善できる。
- `MapSurface.native.tsx` は現在 `react-native-maps` fallbackで安定化している。
- MapLibre復旧はdev build / Release実機 / self-hosted vector styleの検証が絡むため、別タスクとして扱う方が安全。

この修正でMapSurfaceへ触る場合の範囲。

```text
許可:
- friend marker tap callback
- selected friend card表示のためのcallback追加
- existing scene propsの軽微な型拡張

禁止:
- 地図SDKの全面差し替え
- MapLibre復旧を同じPRで行う
- GPS取得やrepository処理をMapSurfaceへ入れる
```

---

## 9. 実装順序

Codexは次の順で進める。

```text
1. liveTerritoryStateにUI helperを追加
   - getLoopCaptureGuidance
   - getFinalizeButtonLabel
   - getMapPrivacyLabel

2. LiveTerritoryPanelを更新
   - STOPを消す
   - ループ説明を追加
   - routePointCount propを追加

3. HomeMapScreen / buildHomeMapScene / MapChromeを更新
   - routePointCountを渡す
   - privacyLabelを実状態にする

4. Onboardingを更新
   - 「囲むと塗れる」コピーへ変更
   - 3ステップ説明を追加

5. 友達マーカータップカードを追加
   - MapSurface callback
   - FriendMapCard
   - HomeMapScreen selected friend state

6. シェアカードPreview共通化
   - TerritoryShareCardData
   - TerritoryShareCard
   - 共有文面改善

7. 招待URLをfriendCodeベースへ変更
   - UserProfile.friendCode追加
   - mock/supabase mapper更新
   - FriendsModal props更新

8. テスト更新

9. typecheck / test 実行
```

---

## 10. 変更後に実行するコマンド

```bash
pnpm --filter @terri/mobile typecheck
pnpm --filter @terri/mobile test
```

地図配信やSupabase Edge Functionに触れていない場合、Denoテストは不要。

Supabase repository mapperやmigrationへ触った場合は、該当テストも確認する。

```bash
pnpm --filter @terri/mobile test -- supabaseTerriRepository
```

---

## 11. 完了条件チェックリスト

### UX

- [ ] 初回説明で「囲むとテリトリーになる」が分かる。
- [ ] live中に「軌跡」と「面積」の違いが分かる。
- [ ] 面積0でも、ユーザーが失敗したように見えない。
- [ ] `STOP` 文言がユーザー向けUIから消えている。
- [ ] マップ上で共有状態が分かる。
- [ ] 友達マーカーをタップするとカードが出る。
- [ ] 完了画面のシェアカードが共通コンポーネント化されている。
- [ ] 招待リンクが固定ダミー文字列ではない。

### 機能

- [ ] `finalizeDailyActivity` の呼び出しは既存通り1回だけ。
- [ ] `syncLiveTerritory` / `finalizeDailyActivity` のRepository契約を壊していない。
- [ ] closed-loop設計を変更していない。
- [ ] friend live presenceを保存していない。
- [ ] `MapSurface` がrepositoryやSupabaseをimportしていない。

### テスト

- [ ] UI helperのunit testがある。
- [ ] LiveTerritoryPanelの表示テストがある。
- [ ] buildHomeMapSceneのprivacyLabelテストがある。
- [ ] FriendMapCardのテストがある。
- [ ] Invite URLのコピー挙動テストがある。
- [ ] `pnpm --filter @terri/mobile typecheck` が通る。
- [ ] `pnpm --filter @terri/mobile test` が通る。

---

## 12. この修正で作成してよいADR

基本的にはUI改善なのでADR不要。ただし、次の場合はADR proposalを作る。

```text
依存ライブラリを追加して画像共有を実装する
招待リンクのURL scheme / deep link / dynamic link基盤を決定する
MapLibreへ戻す、または地図SDK方針を変える
friendCode以外の招待token tableを追加する
```

作る場合の候補。

```text
docs/adr-proposals/0012-invite-link-friend-code-routing.md
docs/adr-proposals/0013-share-card-image-generation.md
docs/adr-proposals/0014-native-map-engine-stabilization.md
```

---

## 13. Codexに渡す短縮プロンプト

```text
TERRIのUX/機能改善を実装してください。AGENTS.mdと各Codex skillに従ってください。

目的は、閉じたループだけが面積になる既存設計をユーザーに分かりやすくすることです。アルゴリズムやRepository境界は大きく変えないでください。

優先順:
1. OnboardingとLiveTerritoryPanelで「線を引く→囲む→塗れる」を説明する。
2. LiveTerritoryPanelのSTOP文言を「今日を確定」/「保存して結果を見る」に変更する。
3. MapChromeのprivacyLabelをFRIENDS ONLY固定から、profileとlive statusに応じた日本語表示へ変更する。
4. 友達マーカータップでFriendMapCardを表示する。
5. CompleteSheetのシェアカードPreviewを共通化し、共有文面をkm²表記へ改善する。
6. FriendsModalの固定招待URLをUserProfile.friendCode由来のURLへ変更する。

必ず近いレイヤーにテストを追加し、最後に `pnpm --filter @terri/mobile typecheck` と `pnpm --filter @terri/mobile test` を通してください。
```
