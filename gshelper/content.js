/**
 * [C]ontent [S]cripts util function
 */
$CS = {
	getManifest: function(callback){
		var url = chrome.extension.getURL('/manifest.json');
		var xhr = new XMLHttpRequest();
		xhr.onload = function(){
			callback(JSON.parse(xhr.responseText));
		};
		xhr.open('GET',url,true);
		xhr.send(null);
	}
};

/**
 * @const
 */
STORE_KEY = {
	PREV_VERSION: 'gsh.prev_version',
	VERSION_CONFIRMED: 'gsh.version_confirmed',
	REG_QUE: 'gsh.reg_que',
	SETTING_CONF: 'gsh.setting_confirmation',
	PROC_SCOPE: 'gsh.process_scope',
	SCH_DEF_GROUP: 'gsh.sch_default_group',
	MONTH_SCH_DEF_MEMBER: 'gsh.monthly_sch_default_member',
	PWEEK_SCH_DEF_MEMBER: 'gsh.personal_weekly_sch_default_member',
	SCH_DEF_PUBLIC: 'gsh.sch_default_publication',
	FILE_LIST_DESORT_COL: 'gsh.file_list_default_sort_column',
	FILE_LIST_DEF_ORDER: 'gsh.file_list_default_order'
};

GSHelper = {
	/**
	 * 初期処理
	 */
	init: function(){
//		var locPath = location.pathname;
		var locPath = $('form').attr('action');
		this.retryMgr.init();

		if (locPath) {
			var page = locPath.replace(/.+\/([^/]+)\.do$/, '$1');
			//メインページ
			if (page == 'man001') {
				//バージョン更新確認
				if (sessionStorage[STORE_KEY.VERSION_CONFIRMED] != 'true') {
					this.versionMgr.init();
				}
			}

			if (page && this[page]) {
				this[page].init();
			}
		}
		return this;
	},

	/**
	 * リトライマネージャ
	 */
	retryMgr: {
		//初期化
		init: function(){
			this.cnt = {};
			this.max = { def: 10 };
		},
		//リトライ回数カウントアップ
		countUp:  function(pageId){
			return (++this.cnt[pageId] || (this.cnt[pageId] = 1));
		},
		//まだリトライするか(最大リトライ回数に達していないか)
		isRetryable: function(pageId){
			return (this.cnt[pageId] || 0) < (this.max[pageId] || this.max.def);
		}
	},

	/**
	 * バージョンマネージャ
	 */
	versionMgr: {
		//初期化
		init: function(){
			this.prevVer = localStorage[STORE_KEY.PREV_VERSION];
			$CS.getManifest($.proxy(function(manifest){
				this.curVer = manifest.version;
				if (this.isUpdated()) {
					this.notifyUpdate();
					this.updatePrevVersion();
				}
			}, this));
			sessionStorage[STORE_KEY.VERSION_CONFIRMED] = 'true';
		},
		//アップデートされているか
		isUpdated: function(){
			return (!this.prevVer || (this.prevVer != this.curVer));
		},
		//以前のバージョンとして記録している情報を更新
		updatePrevVersion: function(){
			localStorage[STORE_KEY.PREV_VERSION] = this.curVer;
		},
		//更新されたのを通知
		notifyUpdate: function(){
			var txt = 'GSHelper was upgraded to ' + this.curVer + ' (from ' + this.prevVer + ')... ';
			var path = chrome.extension.getURL('/release_notes.html');
			var anc = $('<a href="#" onclick="window.open(\'' + path + '\')">show details</a>')
						.addClass('sc_ttl_sat');
			$('<div>').text(txt).append(anc)
			.css({
				fontSize: '12px',
				margin: '5px 0 5px 0',
				minHeight: '40px',
				padding: '10px',
				textAlign: 'left'
			}).appendTo($('#mainScreenListLeft') || $(document.body || document.frames[0]));
		}
	},

	/**
	 * 処理中のスコープを設定
	 */
	setProcScope: function(scope){
		sessionStorage[STORE_KEY.PROC_SCOPE] = scope;
	},
	/**
	 * 処理中のスコープをクリア
	 */
	clearProcScope: function(){
		sessionStorage.removeItem(STORE_KEY.PROC_SCOPE);
	},

	/**
	 * main/man001.doマネージャ
	 */
	man001: {
		//初期化
		init: function(){
			var monthSchBtn = $('.btn_base1s_1, .btn_month'),
				pweekSchBtn = $('.btn_base1s_2, .btn_week_kojin'),
				schForm = $('form[name=schmainForm]');

			//対象エレメントが存在しない間は待機
			if (!monthSchBtn.length || !pweekSchBtn.length || !schForm.length) {
				if (GSHelper.retryMgr.isRetryable('man001')) {
					GSHelper.retryMgr.countUp('man001');
					setTimeout($.proxy(arguments.callee, GSHelper), 300);
				}
				return;
			}

			//スケジュール表示ボタン押下後の遷移先初期表示を 個人設定に合わせる
			//(スケジュール画面表示後にリロードしなくて済むようになるだけ)
			$([{
				btn: monthSchBtn,
				prms: {
					sch010DspGpSid: localStorage[STORE_KEY.SCH_DEF_GROUP],
					sch020SelectUsrSid: localStorage[STORE_KEY.MONTH_SCH_DEF_MEMBER]
				},
				procScope: 'sch020'
			}, {
				btn: pweekSchBtn,
				prms: {
					sch010DspGpSid: localStorage[STORE_KEY.SCH_DEF_GROUP],
					sch100SelectUsrSid: localStorage[STORE_KEY.PWEEK_SCH_DEF_MEMBER]
				},
				procScope: 'sch200'
			}]).each(function(i, target){
				//遷移ボタンにラッパーを設定
				target.btn.wrap('<span>').parent().get(0)
				.addEventListener('click', function(){
					//スケジュール画面遷移時に一緒にポストされるようにhiddenを追加
					var prms = [{
						name: 'sch020SelectUsrSid',
						value: localStorage[STORE_KEY.MONTH_SCH_DEF_MEMBER]
					}];
					$.each(target.prms, function(k, v){
						$('<input>').attr({
							type: 'hidden',
							name: k,
							value: v
						}).appendTo(schForm);
					});
					GSHelper.setProcScope(target.procScope);
				}, true);
			});

			//スケジュール登録ボタンのイベントリスナ追加
			$('#tooltips_sch, #schedule_schmain').find('a')
			.filter('[onclick*=addSchedule]').find('img')
			.on('click', function(evt){
				evt.preventDefault();
				GSHelper.sch040.presetDefaultPublic($(this).closest('form'));
			});
		}
	},

	/**
	 * schedule/schmain.doマネージャ
	 * (メイン画面に表示されるスケジュール)
	 */
	schmain: {
		//初期化
		init: function(){
			//スケジュール登録ボタンのイベントリスナ追加
			$('a')
			.filter('[onclick*=addSchedule]').find('img')
			.on('click', function(evt){
				GSHelper.sch040.presetDefaultPublic();
			});
		}
	},

	/**
	 * schedule/sch010.doマネージャ
	 * (週間スケジュール画面)
	 */
	sch010: {
		//初期化
		init: function(){
			//スケジュール登録ボタンのイベントリスナ追加
			$('a')
			.filter('[onclick*=addSchedule]').find('img')
			.on('click', function(evt){
				evt.preventDefault();
				GSHelper.sch040.presetDefaultPublic();
			});
		}
	},

	/**
	 * schedule/sch020.doマネージャ
	 * (月間スケジュール画面)
	 */
	sch020: {
		scope: 'sch020',
		//初期化
		init: function(){
			var self = this, todayTd;
			if (sessionStorage[STORE_KEY.PROC_SCOPE] != this.scope) {
				this.setProcScope();
				//選択内容を保存されている内容に変更(初期表示変更)
				$('select[name=sch020SelectUsrSid]')
					.val(localStorage[STORE_KEY.MONTH_SCH_DEF_MEMBER]).change();
				return;
			}
			this.clearProcScope();

			//当日のハイライトを強化
			todayTd = $('.sc_thismonth_today').closest('td').css({
				cssText: 'border: 3px solid #ffdd6f !important',
				backgroundColor: '#ffffcc'
			}).get(0);
			//当日を画面内に表示
			if (todayTd) {
				window.scrollTo(todayTd.offsetLeft, todayTd.offsetTop);
			}

			//グループ・メンバーのイベントリスナ追加
			$('select').filter('[name=sch020SelectUsrSid],[name=sch010DspGpSid]')
			.change(function(){
				self.setProcScope();
			});

			$('a')
			//月移動ボタンのイベントリスナ追加
			.filter(':has(img)[onclick*=buttonPush][href=#]')
			.on('click', function(){
				self.setProcScope();
			})
			.end()
			//スケジュール登録ボタンのイベントリスナ追加
			.filter('[onclick^=addSchedule]').find('img')
			.on('click', function(evt){
				evt.preventDefault();
				GSHelper.sch040.presetDefaultPublic();
			});
		},
		//処理スコープ設定
		setProcScope: function(){
			GSHelper.setProcScope(this.scope);
		},
		//処理スコープ解除
		clearProcScope: function(){
			GSHelper.clearProcScope();
		}
	},

	/**
	 * schedule/sch030.doマネージャ
	 * (日間スケジュール画面)
	 */
	sch030: {
		//初期化
		init: function(){
			//スケジュール登録ボタンのイベントリスナ追加
			$('a')
			.filter('[onclick^=addSchedule]').find('img')
			.on('click', function(evt){
				evt.preventDefault();
				GSHelper.sch040.presetDefaultPublic();
			});
		}
	},

	/**
	 * schedule/sch040.doマネージャ
	 * (スケジュール登録画面)
	 */
	sch040: {
		init: function(){
			var $pubRdo = $('input').filter('[name=sch040Public]');
			//グループスケジュールの登録時には公開区分が公開・非公開しかなく
			//初期値設定でそれ以外が指定されていると、ラジオボタンのどれもチェックされていない
			//状態になる。その場合は先頭の選択肢をチェックじょうたいにしておく。
			if (!$pubRdo.filter(':checked').length) {
				$pubRdo[0].checked = true;
			}
		},
		presetDefaultPublic: function(form){
			var $form = $(form || document.forms[0]);
			$.each(['sch040Public', 'sch041Public'], function(i, name){
				var $input = $('input[name=' + name + ']');
				if (!$input.length) {
					$input = $('<input type="hidden" name="' + name + '">');
				}
				$input.val(localStorage[STORE_KEY.SCH_DEF_PUBLIC]).appendTo($form);
			});
		}
	},

	/**
	 * schedule/sch041.doマネージャ
	 * (スケジュール繰り返し登録画面)
	 */
	sch041: {
		init: function(){
		}
	},

	/**
	 * schedule/sch200.doマネージャ
	 * (個人週間スケジュール画面)
	 */
	sch200: {
		scope: 'sch200',
		//初期化
		init: function(){
			var self = this;
			if (sessionStorage[STORE_KEY.PROC_SCOPE] != this.scope) {
				this.setProcScope();
				//選択内容を保存されている内容に変更(初期表示変更)
				$('select[name=sch010DspGpSid]')
					.val(localStorage[STORE_KEY.SCH_DEF_GROUP]);

				$('select[name=sch100SelectUsrSid]')
					.val(localStorage[STORE_KEY.PWEEK_SCH_DEF_MEMBER]).change();
				return;
			}
			this.clearProcScope();

			//グループ・メンバーのイベントリスナ追加
			$('select').filter('[name=sch010DspGpSid],[name=sch100SelectUsrSid]')
			.change(function(){
				self.setProcScope();
			});

			//週・日移動ボタンのイベントリスナ追加
			$('a')
			.filter(':has(img)[onclick*=buttonPush][href=#]')
			.on('click', function(){
				self.setProcScope();
			});

			//日時セル(スケジュール登録ボタン)のイベントリスナ追加
			$('#calendar')
			.on('mousedown', '.fc-day-content, .ui-widget-content', function(){
				GSHelper.sch040.presetDefaultPublic();
			});
		},
		//処理スコープ設定
		setProcScope: function(){
			GSHelper.setProcScope(this.scope);
		},
		//処理スコープ解除
		clearProcScope: function(){
			GSHelper.clearProcScope();
		}
	},

	/**
	 * schedule/sch091.doマネージャ
	 * (スケジュール初期値設定画面)
	 */
	sch091: {
		DEF_PUB_SELECTOR: 'input[name=sch091PubFlg]',
		//初期化
		init: function(){
			var self = this;
			this.addPubOption();
			this.setCurrentPubSetting();

			//OKボタン押下時のイベントリスナ追加
 			$('.btn_ok1').click(function(){
 				//OKボタン押下後、確認画面を経由するので設定内容をsessionStrogeに保持しておく
 				var q = {};
 				q[STORE_KEY.SCH_DEF_PUBLIC] = $(self.DEF_PUB_SELECTOR)
 												.filter(':checked').val();
 				sessionStorage[STORE_KEY.REG_QUE] = JSON.stringify(q);

				self.$pubOnlyGroupRdo.attr('name', '_sch091PubFlg');
			}).each(function(){
				//既定のonclick属性の処理が後になるように
				this.onclick = this.onclick;
			});
		},
		//公開設定の選択肢を追加
		addPubOption: function(){
			var $orgRadio = $(this.DEF_PUB_SELECTOR).filter(':last'),
				$orgLabel = $orgRadio.next();
			//[所属グループのみ公開]ラジオボタンを追加
			var $rdo = $orgRadio.clone()
						.attr({
							id: "sch091PubFlg3",
							checked: false
						}).val('3')
						.insertAfter($orgLabel),
				$lbl = $orgLabel.clone().find('label')
						.text('所属グループのみ公開')
						.attr('for', 'sch091PubFlg3').end()
						.insertAfter($rdo);
			this.$pubOnlyGroupRdo = $rdo;
		},
		//現在の公開設定内容に合ったラジオボタンを選択状態にする
		setCurrentPubSetting: function(){
			var defVal = GSHelper.getOrgSettingDefVal(STORE_KEY.SCH_DEF_PUBLIC);
			$(this.DEF_PUB_SELECTOR).val([defVal]);
		}
	},

	/**
	 * schedule/sch093.doマネージャ
	 * (グループメンバー表示設定画面)
	 */
	sch093: {
		//初期化
		init: function(){
			var self = this;
			this.$defGrp = $('select[name=sch093DefGroup]');
			this.createContainer();
			//メンバーセレクトボックスを表示
			this.setMemberSelector(this.getGpSid());
			//グループ変更時のイベントリスナ追加
			this.$defGrp.change(function(){
				self.setMemberSelector(this.value);
			});
			//OKボタン押下時のイベントリスナ追加
			$('.btn_ok1').click(function(){
				//OKボタン押下後、確認画面を経由するので設定内容をsessionStrogeに保持しておく
				var q = {};
				q[STORE_KEY.SCH_DEF_GROUP] = self.$defGrp.val();
				q[STORE_KEY.MONTH_SCH_DEF_MEMBER] = self.$defMonthMbr.val();
				q[STORE_KEY.PWEEK_SCH_DEF_MEMBER] = self.$defPWeekMbr.val();
				sessionStorage[STORE_KEY.REG_QUE] = JSON.stringify(q);
			});
		},
		//グループID取得
		getGpSid: function(){
			return this.$defGrp.val();
		},
		//コンテナ作成
		createContainer: function(){
			var grp_tr = $('select[name=sch093DefGroup]').closest('tr');
			var mbr_tr = grp_tr.clone()
							.find('.text_bb1').text('デフォルト表示メンバー').end()
							.find('.text_r2').remove().end()
							.find('td:eq(1)').empty().end()
							.insertAfter(grp_tr);
			this.$mbrContainer = mbr_tr.find('td:eq(1)');
		},
		//メンバーセレクトボックスを表示
		setMemberSelector: function(gpId){
			var params = [{
				url: 'sch020.do',
				key: STORE_KEY.MONTH_SCH_DEF_MEMBER,
				selName: 'sch020SelectUsrSid',
				selProp: '$defMonthMbr',
				label: '月間：'
			}, {
				url: 'sch200.do',
				opt: { sch100SelectUsrSid: '' },
				key: STORE_KEY.PWEEK_SCH_DEF_MEMBER,
				selName: 'sch100SelectUsrSid',
				selProp: '$defPWeekMbr',
				label: '個人週間：'
			}];

			$.each(params, $.proxy(function(i, p){
				var selbox = this[p.selProp],
					labelCss = {
						width: '80px',
						display: 'inline-block',
						textAlign: 'right',
						paddingRight: '5px'
					},
					loadingOpt = '<option>読み込み中...</option>',
					mbrId = null;
				//selectboxが存在しない場合(初期読込時)
				if (!selbox) {
					//空のselectboxを設置
					this[p.selProp] = selbox =
						$('<select id="' + p.selName +'" disabled>' + loadingOpt + '</select>');
					$('<div>').appendTo(this.$mbrContainer).append(selbox);
					//ラベルも作る
					var label = $('<span>').text(p.label).addClass('text_bb1')
								.css(labelCss);
					selbox.before(label);
				} else {
					//selectboxが存在する場合は中身を一旦空にする
					selbox.prop('disabled', true)
						.find('option').remove().end().append(loadingOpt);
					mbrId = selbox.val();
				}

				$.post('../schedule/' + p.url,
					$.extend({ sch010DspGpSid: gpId }, p.opt),
					$.proxy(function(res){
						var defVal = GSHelper.getOrgSettingDefVal(p.key, mbrId),
							resSel = $(res).find('select[name=' + p.selName + ']')
										.removeAttr('onchange').unbind().val(defVal);
						//取得した内容にselectboxの中身を入れ替え
						selbox.find('option').remove().end()
							.append(resSel.find('option')).prop('disabled', false);
				}, this));
			}, this));
		}
	},

	/**
	 * file/fil040.doマネージャ
	 * (ファイル管理 フォルダ内容画面)
	 */
	fil040: {
		scope: 'fil040',
		//初期化
		init: function(){
			var self = this;
			var $sortableColumnHeader = $('.td_type_file:has(a)')
										.filter(function(){
											return $(this).text() != '';
										});
			if (sessionStorage[STORE_KEY.PROC_SCOPE] != this.scope) {
				this.setProcScope();

				var defSort = localStorage[STORE_KEY.FILE_LIST_DEF_SORT_COL] || '';
				var defOrder = localStorage[STORE_KEY.FILE_LIST_DEF_ORDER] || '';
				//初期表示順が保存されていれば
				if (defSort && defOrder) {
					//表示順を保存されている内容に変更(初期表示変更)
					var $form = $('form[name=fil040Form]');
					$('[name=fil040SortKey]', $form).val(defSort);
					$('[name=fil040OrderKey]', $form).val(defOrder);
					$('[name=CMD]', $form).val('titleClick');
					$form.submit();
				}
				return;
			}
			this.clearProcScope();

			//グループ・メンバー変更時のイベントリスナ追加
			$sortableColumnHeader.each(function(){
				//キャプチャフェーズで発火したいのでaddEventListenerを使用
				this.addEventListener('click', function(){
					self.setProcScope();
				}, true);
			});

			this.createDDZone();
		},
		//ファイルドラッグ&ドロップエリア作成
		createDDZone: function(attribute){
var url = '../common/cmn110.do';
	url = url + '?cmn110parentListName=fil080TempFiles';
	url = url + '&cmn110pluginId=file';
	url = url + '&cmn110fileLimit=1';
	url = url + '&cmn110Mode=3';
			var $iframe = $('<iframe src="' + url + '" height="200" width="200">');
var q = 'backDspLow=fil040&CMD=fil040addFile&fil070ParentDirSid=' + document.forms[0].fil010SelectDirSid.value;
			var $iframe2 = $('<iframe src="../file/fil040.do?' + q + '" height="200" width="200">');
			$('.prj_tbl_base3').after($iframe, $iframe2);
			$iframe.on('load', function(){
				var $document = $(this).contents();
				//$document.find('input[type=button][value=添付]').click();
			});
		},
		//処理スコープ設定
		setProcScope: function(){
			GSHelper.setProcScope(this.scope);
		},
		//処理スコープ解除
		clearProcScope: function(){
			GSHelper.clearProcScope();
		}
	},

	/**
	 * file/fil120.doマネージャ
	 * (ファイル管理 表示設定画面)
	 */
	fil120: {
		//初期化
		init: function(){
			var self = this;
			this.createContainer();
			//ソート可能項目セレクトボックスを表示
			this.setSortColSelector();
			//昇順・降順選択ラジオボタンを表示
			this.setOrderSelector();
			//OKボタン押下時のイベントリスナ追加
			$('.btn_ok1').click(function(e){
				//OKボタン押下後、確認画面を経由するので設定内容をsessionStrogeに保持しておく
				var q = {};
				q[STORE_KEY.FILE_LIST_DEF_SORT_COL] = self.$sortCol.val();
				q[STORE_KEY.FILE_LIST_DEF_ORDER] = self.$orders.filter(':checked').val();
				sessionStorage[STORE_KEY.REG_QUE] = JSON.stringify(q);
				GSHelper.storeOrgSettingDesc(self.$container);
			});
		},
		//コンテナ作成
		createContainer: function(){
			var lastRow = $('.tl_u2 tr:last');
			var newRow = lastRow.clone()
						.find('.text_bb1').text('初期表示順').end()
						.find('.text_r2').remove().end()
						.find('td:eq(1)').empty().end()
						.insertAfter(lastRow);
			this.$container = newRow.find('td:eq(1)');
		},
		//ソート可能項目セレクトボックスを表示
		setSortColSelector: function(){
			var LANDMARK = 'MoveToRootFolderList';
			var defVal = GSHelper.getOrgSettingDefVal(STORE_KEY.FILE_LIST_DEF_SORT_COL);

			if (!this.$sortCol) {
				this.$sortCol = $('<select id="sortCol">')
								.append('<option>読み込み中...</option>')
								.prop('disabled', true);
			}
			this.$container.append(this.$sortCol);

			//フォルダ情報画面(fil040.do)にアクセスする為、キャビネット一覧画面(fil010.do)から
			//キャビネットID・ディレクトリIDを1組取得する
			$.post('../file/fil010.do', $.proxy(function(res){
				var resPart = $(res).find('#file-list-table a[onclick^=' + LANDMARK + ']:first')
								.parent().html();
				var params = resPart.replace(/[\n\s]+/g, '')
								.match(new RegExp(LANDMARK + '\\((\\d+),(\\d+)\\)'));

				//取得したキャビネットID・ディレクトリIDのキャビネット一覧画面にアクセスし、ソート可能項目を取得する
				$.post('../file/fil040.do',
					{ fil010SelectCabinet: params[1], fil010SelectDirSid: params[2] },
					$.proxy(function(res){
						var $cols = $(res).find('.td_type_file a');
						var opt = '';

						$cols.each(function(){
							var t = $(this).text().replace(/[▼▲]/g, ''), v;
							if (t && this.onclick) {
								v = this.onclick.toString()
									.replace(/[\n\s]+/g, '')
									.match(new RegExp('fil040TitleClick\\((\\d+),.*\\)'))[1];
								opt += '<option value="' + v + '">' + t + '</option>';
							}
						});

						this.$sortCol.html(opt).prop('disabled', false).val(defVal);
				}, this));
			}, this));
		},

		//昇順・降順選択ラジオボタンを表示
		setOrderSelector: function(){
			var radios = [{ val: 0, label: '昇順' }, { val: 1, label: '降順' }],
				h = '';
			var defVal = GSHelper.getOrgSettingDefVal(STORE_KEY.FILE_LIST_DEF_ORDER);

			$.each(radios, function(i, r){
				h += '<input type="radio" id="order' + i + '" name="order" value="' + r.val + '"';
				h += (r.val==defVal ? ' checked="checked"' : '') + ' style="margin-left:15px;">';
				h += '<span class="text_base"><label for="order' + i + '">' + r.label + '</label></span>';
			});

			this.$container.append(h);
			this.$orders = $('[name=order]');
		}
	},

	/**
	 * file/fil120kn.doマネージャ
	 */
	fil120kn: {
		//初期化
		init: function(){
			GSHelper.showOrgSettingConf();
		}
	},

	/**
	 * smail/sml020.doマネージャ
	 * (ショートメール 新規作成(返信)画面)
	 */
	sml020: {
		//初期化
		init: function(){
			this.shortenReplyTitle();
		},
		//返信時の件名を短くする(Re:Re:Re:…となるのをRe3:等にする)
		shortenReplyTitle: function(){
			var $title = $('input[name=sml020Title]'),
				titleText = $title.val(),
				rePart, mainPart, count = 0, reAry, re;

			if (titleText.match(/^((?:Re\d*[：:])+)(.*)$/ig)) {
				//件名の頭のRe:…部分
				rePart = RegExp.$1;
				//件名のRe:…以降の部分
				mainPart = RegExp.$2;
				//Re:…部分を大文字に変換・"："を半角に変換して:で分割
				reAry = rePart.toUpperCase().replace(/：/g, ':').split(/:/);
				//Reが一回だけの場合は何もしない
				if (reAry.length == 1 && reAry[0] == 'RE') { return; }
				//Reを数える
				for (i = 0; re = reAry[i++];) {
					count += (re == 'RE') ? 1 : Number(re.replace(/\D+(\d)+$/, '$1'))
				}
				$title.val('Re' + (count > 1 ? count : '') + ':' + mainPart);
			}
		}
	},

	/**
	 * ringi/rng030.doマネージャ
	 * (稟議	内容確認画面)
	 */
	rng030: {
		//初期化
		init: function(){
			this.displayLinkURL();
		},
		//表示中の稟議へのリンクURLを表示する
		displayLinkURL: function(){
			var $container = $('.btn_back_n1').filter(':last').closest('td'),
				wrapperHtml = '<div style="display:inline-block;width:49%;">',
				sid = $('input[name=rngSid]').val(),
				linkUrl = location.origin +
							'/gsession/common/cmn001.do?url=%2Fgsession%2Fringi%2Frng030.do%3FrngSid%3D' + sid,
				$label = $('<label for="ringiUrl">URL:</label>'),
				$input = $('<input id="ringiURl" value="' + linkUrl + '"' +
							' style="color:#666;width:400px;" readonly>');

			$container.wrapInner(wrapperHtml);
			$(wrapperHtml).css({
				color: '#666',
				textAlign: 'left'
			}).append($label, $input).prependTo($container);
			$('#ringiURl').on('click', function(){ $(this).select(); });
		}
	},

	/**
	 * common/cmn999.doマネージャ
	 * (登録/更新 確認画面)
	 */
	cmn999: {
		//初期化
		init: function(){
			//OKボタン押下時のイベントリスナ追加
			$('.btn_ok1').click(function(){
				//前画面で登録待ちの値がsessionStorageに保持されている場合は
				//それらをlocalStorageに保存する
				if (sessionStorage[STORE_KEY.REG_QUE]) {
					var q = JSON.parse(sessionStorage[STORE_KEY.REG_QUE]);
					$.each(q, function(k, v){
						localStorage[k] = v;
					});
					sessionStorage.removeItem(STORE_KEY.REG_QUE);
					sessionStorage.removeItem(STORE_KEY.SETTING_CONF);
				}
			}).each(function(){
				//既定のonclick属性の処理が後になるように
				this.onclick = this.onclick;
			});
		}
	},

	/**
	 * 設定画面における独自設定項目に設定中の(設定すべき)値を取得する
	 * (設定画面への遷移時・設定画面内でのAjaxによる項目再描画時・確認画面から戻った時 等)
	 * 優先度：【高】 設定画面で選択した値 > SessionStorateの値 > LocalStorageの値 【低】
	 */
	getOrgSettingDefVal: function(storeKey, val){
		return val ||
				(sessionStorage[STORE_KEY.REG_QUE] ?
					JSON.parse(sessionStorage[STORE_KEY.REG_QUE])[storeKey] : null) ||
				localStorage[storeKey] || '';
	},

	/**
	 * 設定確認画面に独自設定項目を表示するための情報を保存する
	 * (確認画面に表示するための情報なのでフォーム部品の値ではなく、選択肢の名称やラベルが対象)
	 */
	storeOrgSettingDesc: function(containers){
		var settings = [];
		//指定されたコンテナ内のフォーム部品から設定内容を取得し、保存する
		$(containers).each(function(){
			var $ctn = $(this);
			var title = $ctn.prevAll('.td_sub_title3').text().replace(/\s/g, '');
			var values = [];
			$ctn.find(':input, :radio, :checkbox').each(function(){
				var $e = $(this), name = '', val = '';
				//selectbox
				if ($e.is('select')) {
					name = $('label[for=' + $e.attr('id') + ']').text();
					val = $e.find('option:selected').text();
				//radio button or checkbox
				} else if($e.is(':radio, :checkbox')) {
					//selected radio button or checkbox
					if ($e.is(':checked')) {
						name = $e.parent().not($ctn).text();
						val = $('label[for=' + $e.attr('id') + ']').text();
					}
				//other input element
				} else {
					name = $('label[for=' + $e.attr('id') + ']').text();
					val = $e.val();
				}
				if (name || val) {
					values.push({ name: name, val: val });
				}
			});
			settings.push({ title: title, items: values });
		});
		sessionStorage[STORE_KEY.SETTING_CONF] = JSON.stringify(settings);
	},

	/**
	 * 設定確認画面に独自設定項目を表示する
	 */
	showOrgSettingConf: function(){
		var lastRow = $('.tl_u2 tr:last');
		//保存されている設定項目の情報を取得
		var settings = JSON.parse(sessionStorage[STORE_KEY.SETTING_CONF]);
		//設定項目描画
		$.each(settings, function(i, setting){
			var row = lastRow.clone()
					.find('.text_bb1').text(setting.title).end()
					.find('.text_r2').remove().end()
					.find('td:eq(1)').empty().end()
					.insertAfter(lastRow);
			var t = '';
			$.each(setting.items, function(j, item){
				t += t ? ', ' : '';
				t += item.name ? (item.name + '：') : '';
				t += item.val;
			});
			row.find('td:eq(1)').html('<span class="text_base">' + t + '<span>');
		});
	}
};

$(function(){GSHelper.init()});