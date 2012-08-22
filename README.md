無料グループウェア GroupSession (http://www.gs.sjts.co.jp/ )のchrome extension です。  
  
#### 機能：  
1. スケジュールのデフォルト表示メンバーが設定できるようになります。  
(初期表示を[月間]＋[グループ＋所属ユーザ]にできます。)  
2. ファイルの初期表示順が設定できるようになります。  
  
  
#### 使用方法：  
  
1. http://yamayamayamaji.github.com/GSHelper/ でzipダウンロード  
  
2. 解凍してできたフォルダ内の  
/gshelper/chrome-extension/manifest.json を開き  
"matches"と"permissions"のurlを自分の使っているサーバーに変更  
  
3. chrome://extensions で[拡張機能のパッケージ化]を押し  
2.と同じ解凍してできたフォルダ内の /gshelper/chrome-extension をルートディレクトリに指定  
(秘密鍵ファイルは指定しなくても大丈夫です)  
   * → gshelperフォルダ内に chrome-extension.crx と chrome-extension.pem が作成されます。  
  
4. chrome-extension.crx をchromeにドラッグ&ドロップしてインストール  
  
chrome-extension.crxをメンバーに共有・配布して使うこともできます。  
