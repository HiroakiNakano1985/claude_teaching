# プロンプト道場 12週間プログラム — Phase 0 検証アプリ

設計書 v0.4.1 の **Phase 0(リーン検証)** 実装。noteやMOSHに肩代わりさせられない「堀」の部分=
**一本道の完走UX × AI添削つきミニ演習** だけを薄く実装し、**完走率の実測**を目的とします。
配信・決済・特商法はプラットフォーム側に委ね、ここでは作りません(設計書 §6・§0.6)。

## 何ができるか

- **一本道UI**:「今日やること」を常に1つだけ提示(ホーム)。ストリークと進捗を可視化。
- **ミニ演習(穴埋め → ライブ実行 → AI添削)**:空欄を埋めて指示文を組み立て、Claudeが実際に成果物を生成。
  さらに、書いた**指示文そのもの**を4軸(目的・文脈・制約・出力形式)で自動フィードバック。
- **ブリッジ課題**:自分のClaudeで1回使う転移装置(自己申告チェック)。
- **1問クイズ**:理解の確認。
- **週末課題のAI添削**:自由記述の指示文をルーブリックで採点(合否・点数・改善点・お手本)。
- **収録範囲**:週1〜4(フェーズ1=型を入れる)。週1は完全版、週2〜4は実コンテンツ(β拡張前提)。

## 技術スタック

- Next.js 14(App Router)+ TypeScript + Tailwind CSS(モバイルファースト)
- Anthropic API(`@anthropic-ai/sdk`)— サーバー側のRoute Handlerからのみ呼び出し(APIキーは非公開)
- モデルルーティング:ライブ実行=Sonnet / 採点=Haiku(設計書 §3.3)
- 進捗・ストリーク:`localStorage`(Phase 0のみ。認証・DBはPhase 1)

## セットアップ

前提:Node.js 18+ がインストール済み。

```bash
cd phase0-app
npm install

# 環境変数を設定
copy .env.example .env.local   # Windows (PowerShell/cmd)
# cp .env.example .env.local   # macOS / Linux
# → .env.local を開き、ANTHROPIC_API_KEY に自分のキーを設定

npm run dev
# http://localhost:3000 を開く(スマホ表示が前提のレイアウト)
```

APIキーは https://console.anthropic.com/ で取得します。
キー未設定でも画面は動きますが、ミニ演習の「実行」と週末課題の「添削」はエラーになります。

## 本番ビルド

```bash
npm run build
npm start
```

## ディレクトリ

```
src/
  app/
    page.tsx                    ホーム(一本道・ストリーク・進捗)
    lesson/[week]/[day]/page.tsx レッスン(解説→演習→ブリッジ→クイズ)
    weekend/[week]/page.tsx      週末課題(AI添削)
    api/exercise/route.ts        ミニ演習:ライブ実行 + 自動フィードバック
    api/grade/route.ts           週末課題:ルーブリック採点
  lib/
    curriculum.ts                週1〜4の教材データ(ここを編集して内容を増やせる)
    types.ts / anthropic.ts / progress.ts
  components/
    ExerciseRunner / Quiz / Markdown / Scores
```

## コンテンツの増やし方

`src/lib/curriculum.ts` の `CURRICULUM` 配列に週・レッスン・週末課題を追記するだけで、
ホームと一本道導線、採点に自動で反映されます(UIの変更は不要)。

## Phase 0で測ること(設計書 §6 のGo/No-Go)

- 有料β(15〜30人)で「¥1,280を払うか」「週1〜4を完走するか」。
- **完走率が30%(Kill基準)を超えたら**、Phase 1で認証・決済・通知・CMS等の本開発に進む。
- 進捗データはこの端末ローカルのため、β運用では各自の完了報告 or 簡易計測の併用を想定。

## 注意

- 本アプリはAnthropic社の公式製品ではありません。学習教材内で「Claude」を題材に扱います。
- Phase 0の割り切り:認証・課金・サーバー保存・通知は未実装(Phase 1で追加)。
