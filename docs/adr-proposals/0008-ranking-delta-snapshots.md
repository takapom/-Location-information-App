# ADR Proposal 0008: ランキング前週比を期間比較RPCで計算する

## Status

Proposed

## Context

S09ランキングは `RankingEntry.deltaKm2` を持ち、要件定義でも「先週比+0.3km²」のような成長バッジを求めている。現在の `list_friend_rankings()` は本人とaccepted友達だけを返す認可境界を持つが、`delta_area_m2` は常に `0` で、実際の前週比になっていない。

ADR 0004ではランキングの正を `daily_activities.area_m2` としている。今回もその契約を維持し、mobileから `daily_activities` や友達の活動履歴を直接読ませない。

## Decision

- `list_friend_rankings()` の返却契約は維持する。
- `delta_area_m2` は直近7日間の `daily_activities.area_m2` 合計から、その前7日間の合計を引いた値にする。
- 基準日はDBの `current_date` とし、直近7日は `current_date - 6` から `current_date` まで、その前7日は `current_date - 13` から `current_date - 7` までとする。
- 対象ユーザーはこれまで通り、現在ユーザー本人と `friendships.status = 'accepted'` の友達だけに限定する。
- 順位は引き続き総面積 `total_area_m2` の降順で決める。deltaは順位決定に使わない。
- snapshot tableは今回追加しない。MVPでは日次活動の期間集計で要件の「前週比」を満たし、将来集計コストや履歴固定が必要になった時点でsnapshot化する。

## Consequences

- mobileのrepository契約は `RankingEntry.deltaKm2` のまま維持できる。
- `deltaKm2` は正、負、0のいずれも返るため、UIは固定の上向き表示ではなく実値に合わせる必要がある。
- DBの `current_date` を基準にするため、厳密なユーザー別timezone比較は将来課題として残る。
- 非友達の活動面積を露出する経路は増えない。

## Implementation Notes

- `supabase/migrations/0011_ranking_delta_periods.sql` で `list_friend_rankings()` を置き換える。
- SQL contract testで、直近7日/前7日の集計と `dense_rank()` の維持を検証する。
- mock repository fixtureも非0 deltaを持つ既存契約を維持する。
