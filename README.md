無料グループウェア GroupSession (http://www.gs.sjts.co.jp/ )用のchrome extension です。  
  
#### 機能：  
1. スケジュールのデフォルト表示メンバーが設定できるようになります。 (0.1.0～)  
(初期表示を[月間]＋[グループ＋所属ユーザ]にできます。)  
2. ファイルの初期表示順が設定できるようになります。 (0.1.1～)  
  
  
#### 使用方法：  

1. http://goo.gl/IXep5 で gshelper.crx をダウンロード  

2. gshelper.crx をchromeにドラッグ&ドロップしてインストール  
  
  
  
> _(ver0.2以降、適用対象のurlパターンの指定を変更(scheme,hostを指定せずpathのみ指定)した為  
> 下記作業は不要になりました。)_
> > 1. http://yamayamayamaji.github.com/GSHelper/ でzipダウンロード  
> >   
> > 2. 解凍してできたフォルダ内の  
> > /gshelper/manifest.json を開き  
> > "matches"と"permissions"のurlを自分の使っているサーバーに変更  
> >   
> > 3. chrome://extensions で[拡張機能のパッケージ化]を押し  
> > 2.と同じ解凍してできたフォルダ内の /gshelper をルートディレクトリに指定  
> > (秘密鍵ファイルは指定しなくても大丈夫です)  
> >    * → gshelperと同じ階層に gshelper.crx と gshelper.pem が作成されます。  
> >   
> > 4. gshelper.crx をchromeにドラッグ&ドロップしてインストール  
> > このgshelper.crxをメンバーに共有・配布して使うこともできます。  