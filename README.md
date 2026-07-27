# kankei - 関係するものをつなげていく

概念の関係性を可視化し、思考を広げるためのネットワークアプリケーション。

## 概要

概念（ノード）を作成し、それらを接続（エッジ）して関係性のネットワークを構築する。
- **閲覧**: ゲストユーザーでも全データを閲覧可能
- **作成・接続**: Google認証でログイン後に概念の追加・接続が可能
- **リアルタイム**: Supabase Realtimeで他のユーザーの変更が即座に反映
- **グラフ表示**: 力导向配置で概念間の関係を可視化
- **URL共有**: 概念名をURLに含め、特定の概念へのリンクを共有可能

## 技術スタック

- **フロントエンド**: HTML, CSS (Tailwind CSS), JavaScript (ES Modules)
- **認証**: Google OAuth (Supabase Auth)
- **データベース**: PostgreSQL (Supabase)
- **リアルタイム**: Supabase Realtime

## セットアップ

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. API URL と anon key を控える

### 2. データベースのセットアップ

Supabase Dashboard → SQL Editor で `schema.sql` を実行。

> 既存テーブルをリセットする場合は先に `droptable.sql` を実行。

### 3. Google OAuth の設定

1. [Google Cloud Console](https://console.cloud.google.com/)でOAuthクライアントを作成
2. 承認済みリダイレクトURIに以下を設定:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
3. Supabase Dashboard → Authentication → Providers → Google にクライアントID・シークレットを設定

### 4. Realtimeの有効化

Supabase Dashboard → Database → Replication → `supabase_realtime` パブリケーションに `nodes` と `edges` を追加。

### 5. アプリケーションの起動

```bash
cd static
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` を開く。

### 6. 設定の更新

`static/js/config.js` でSupabase URLとanon keyを設定:

```js
export const SUPABASE_URL = 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = 'your-anon-key';
```

## ユーザー権限

| 操作 | ゲスト | 認証済みユーザー | admin |
|------|--------|------------------|-------|
| 概念の閲覧 | ○ | ○ | ○ |
| 概念の検索 | ○ | ○ | ○ |
| 概念の作成 | × | ○ | ○ |
| 概念の接続 | × | ○ | ○ |
| 概念の削除 | × | 自分が作成したもののみ | ○ |
| データのリセット | × | × | ○ |
| ユーザー名の設定 | × | ○ | ○ |

## プロジェクト構成

```
kankei/
├── schema.sql          # データベーススキーマ
├── droptable.sql       # テーブル削除用
└── static/
    ├── index.html      # メインHTML
    ├── css/
    │   └── style.css   # カスタムCSS
    └── js/
        ├── app.js      # エントリーポイント
        ├── config.js   # Supabase設定
        ├── state.js    # アプリケーション状態
        ├── utils.js    # ユーティリティ関数
        ├── toast.js    # トースト通知
        ├── supabase-api.js  # Supabase CRUD操作
        ├── realtime.js      # リアルタイムサブスクリプション
        ├── auth.js          # 認証・ユーザー管理
        ├── render.js        # UIレンダリング
        ├── search.js        # 検索ドロップダウン
        ├── events.js        # イベントリスナー
        └── graph.js         # グラフCanvas描画
```
