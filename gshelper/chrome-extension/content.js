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

STORE_KEY = {
	PREV_VERSION: 'prev_version',
	VERSION_CONFIRMED: 'version_confirmed',
	REG_QUE: 'reg_que',
	SETTING_CONF: 'setting_confirmation',
	PROC_SCOPE: 'process_scope',
	SCH_DEF_GROUP: 'sch_default_group',
	MONTH_SCH_DEF_MEMBER: 'monthly_sch_default_member',
	PWEEK_SCH_DEF_MEMBER: 'personal_weekly_sch_default_member',
	FILE_LIST_DEF_SORT_COL: 'file_list_default_sort_column',
	FILE_LIST_DEF_ORDER: 'file_list_default_order'
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
			if (locPath.match('/main/man001.do')) {
				//バージョン更新確認
				if (sessionStorage[STORE_KEY.VERSION_CONFIRMED] != 'true') {
					this.versionMgr.init();
				}
				this.man001.init();
			}
			if (locPath.match('/schedule/sch020.do')) {
				this.sch020.init();
			}
			if (locPath.match('/schedule/sch200.do')) {
				this.sch200.init();
			}
			if (locPath.match('/schedule/sch093.do')) {
				this.sch093.init();
			}
			if (locPath.match('/common/cmn999.do')) {
				this.cmn999.init();
			}
			if (locPath.match('/file/fil040.do')) {
				this.fil040.init();
			}
			if (locPath.match('/file/fil120.do')) {
				this.fil120.init();
			}
			if (locPath.match('/file/fil120kn.do')) {
				this.fil120kn.init();
			}
		}
	},

	/**
	 * リトライ管理オブジェクト
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
	 * バージョン管理オブジェクト
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
			var txt = 'DcomGSHelper was upgraded to ' + this.curVer + ' (from ' + this.prevVer + ')... ';
			var path = chrome.extension.getURL('/updates.txt');
			var anc = $('<a href="#" onclick="window.open(\'' + path + '\')">show details</a>').addClass('sc_ttl_sat');
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
	 * main/man001.do読込時に実行
	 * ・スケジュール表示ボタン押下後の遷移先初期表示を 個人設定に合わせる
	 *   (スケジュール画面表示後にリロードしなくて済むようになるだけ)
	 */
	man001: {
		//初期化
		init: function(){
			var monthSchBtn = $('.btn_base1s_1'),
				pweekSchBtn = $('.btn_base1s_2'),
				schForm = $('form[name=schmainForm]');

			//対象エレメントが存在しない間は待機
			if (!monthSchBtn.length || !pweekSchBtn.length || !schForm.length) {
				if (GSHelper.retryMgr.isRetryable('man001')) {
					GSHelper.retryMgr.countUp('man001');
					setTimeout($.proxy(arguments.callee, GSHelper), 1);
				}
				return;
			}

			$([{
				btn: monthSchBtn,
				prms: {
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
					var prms = [
						{name: 'sch020SelectUsrSid', value: localStorage[STORE_KEY.MONTH_SCH_DEF_MEMBER]}
					];
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
		}
	},

	/**
	 * schedule/sch010.do管理オブジェクト
	 * (週間スケジュール画面)
	 */
	sch010: {
		//初期化
		init: function(){
		}
	},

	/**
	 * schedule/sch020.do管理オブジェクト
	 * (月間スケジュール画面)
	 */
	sch020: {
		scope: 'sch020',
		//初期化
		init: function(){
			var self = this;
			if (sessionStorage[STORE_KEY.PROC_SCOPE] != this.scope) {
				this.setProcScope();
				//選択内容を保存されている内容に変更(初期表示変更)
				$('select[name=sch020SelectUsrSid]').val(localStorage[STORE_KEY.MONTH_SCH_DEF_MEMBER]).change();
				return;
			}
			this.clearProcScope();

			//グループ・メンバー変更時のイベントリスナ追加
			$('select').filter('[name=sch020SelectUsrSid],[name=sch010DspGpSid]').change(function(){
				self.setProcScope();
			});
			//月移動ボタン押下時のイベントリスナ追加
			$('a:has(img)[onclick*=buttonPush][href=#]').click(function(){
				self.setProcScope();
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
	 * schedule/sch200.do管理オブジェクト
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
				$('select[name=sch010DspGpSid]').val(localStorage[STORE_KEY.SCH_DEF_GROUP]);
				$('select[name=sch100SelectUsrSid]').val(localStorage[STORE_KEY.PWEEK_SCH_DEF_MEMBER]).change();
				return;
			}
			this.clearProcScope();

			//グループ・メンバー変更時のイベントリスナ追加
			$('select').filter('[name=sch010DspGpSid],[name=sch100SelectUsrSid]').change(function(){
				self.setProcScope();
			});
			//月移動ボタン押下時のイベントリスナ追加
			$('a:has(img)[onclick*=buttonPush][href=#]').click(function(){
				self.setProcScope();
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
	 * schedule/sch093.do管理オブジェクト
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
				var mbrId = this[p.selProp] ? this[p.selProp].val() : null;
				$.post('../schedule/' + p.url, $.extend({ sch010DspGpSid: gpId }, p.opt), $.proxy(function(res){
					var defVal = GSHelper.getOrgSettingDefVal(p.key, mbrId);

					var sel = $(res).find('select[name=' + p.selName + ']')
								.removeAttr('onchange').unbind().val(defVal);

					//selectboxが存在する場合は中身だけ入れ替え(初回以外)
					if (this[p.selProp]) {
						this[p.selProp].find('option').remove().end()
							.append(sel.find('option'));
					//selectboxが存在しない場合はラベルも作る(初回)
					} else {
						this[p.selProp] = sel;
						$('<div>').appendTo(this.$mbrContainer).append(sel);
						var label = $('<span>').text(p.label).addClass('text_bb1')
									.css({width: '80px', display: 'inline-block', textAlign: 'right', paddingRight: '5px'});
						sel.before(label).after('<br>');
					}
				}, this));
			}, this));
		}
	},

	/**
	 * file/fil040.do管理オブジェクト
	 * (ファイル管理 フォルダ内容画面)
	 */
	fil040: {
		scope: 'fil040',
		//初期化
		init: function(){
			var self = this;
			var $sortableColumnHeader = $('.td_type_file:has(a)').filter(function(){
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
	 * file/fil120.do管理オブジェクト
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
				this.$sortCol = $('<select id="sortCol">').append('<option>読み込み中...</option>').prop('disabled', true);
			}
			this.$container.append(this.$sortCol);

			//フォルダ情報画面(fil040.do)にアクセスする為、キャビネット一覧画面(fil010.do)から
			//キャビネットID・ディレクトリIDを1組取得する
			$.post('../file/fil010.do', $.proxy(function(res){
				var resPart = $(res).find('#file-list-table a[onclick^=' + LANDMARK + ']:first').parent().html();
				var params = resPart.replace(/[\n\s]+/g, '').match(new RegExp(LANDMARK + '\\((\\d+),(\\d+)\\)'));

				//取得したキャビネットID・ディレクトリIDのキャビネット一覧画面にアクセスし、ソート可能項目を取得する
				$.post('../file/fil040.do', { fil010SelectCabinet: params[1], fil010SelectDirSid: params[2] }, $.proxy(function(res){
					var $cols = $(res).find('.td_type_file a');
					var opt = '';

					$cols.each(function(){
						var t = $(this).text().replace(/[▼▲]/g, ''), v;
						if (t && this.onclick) {
							v = this.onclick.toString().replace(/[\n\s]+/g, '').match(new RegExp('fil040TitleClick\\((\\d+),.*\\)'))[1];
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
	 * common/cmn999.do管理オブジェクト
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
			});
		}
	},

	/**
	 * file/fil120kn.do管理オブジェクト
	 */
	fil120kn: {
		//初期化
		init: function(){
			GSHelper.showOrgSettingConf();
		}
	},

	/**
	 * 設定画面における独自設定項目に設定中の(設定すべき)値を取得する
	 * (設定画面への遷移時・設定画面内でのAjaxによる項目再描画時・確認画面から戻った時 等)
	 * 優先度：【高】 設定画面で選択した値 > SessionStorateの値 > LocalStorageの値 【低】
	 */
	getOrgSettingDefVal: function(storeKey, val){
		return val ||
				(sessionStorage[STORE_KEY.REG_QUE] ? JSON.parse(sessionStorage[STORE_KEY.REG_QUE])[storeKey] : null) ||
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
