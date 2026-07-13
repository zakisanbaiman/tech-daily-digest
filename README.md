# tech-daily-digest

毎日チェックすべき技術情報を、毎朝1枚の静的HTMLにまとめるデイリーダイジェスト。

- はてなブックマーク（テクノロジー）/ Zenn / Qiita / Hacker News / Publickey などのフィードを毎朝収集
- GPT による「今日の注目3件」ハイライトと英語記事の日本語要約
- GitHub Actions の cron で毎朝 7:00 JST に生成し、GitHub Pages で公開

## 使い方

```bash
npm ci
OPENAI_API_KEY=<your-api-key> npm run generate
open dist-site/index.html
```

`OPENAI_API_KEY` がない場合は AI 要約なしのダイジェストを生成します。

## フィードの追加

`feeds.json` にエントリを1行追加するだけです。コード変更は不要です。

```json
{ "id": "example", "name": "サンプルフィード", "url": "https://example.com/feed.xml", "lang": "ja", "maxItems": 10 }
```
