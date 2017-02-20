(function(){
	'user strict';
	var Util = (function(){
		
			// 存储相关
			var prefix = 'html5_reader_';
			var StorageGetter = function(key) {
				return localStorage.getItem(prefix + key);
			}
			var StorageSetter = function(key,value) {
				return localStorage.setItem(prefix + key,value);
			}

			// 事件委托相关
			var addHandler = function(element, type, handler) {
				if (element.addEventListener) {
					element.addEventListener(type, handler, false);
				}
				else if (element.attachEvent) {
					element.attachEvent("on"+type, handler);
				}
				else{
					element["on"+type] = handler;
				}
			};
			var getEvent = function(event) {
				return event? event:window.event;
			}
			var getTarget = function(event) {
				return event.target || event.srcElement;
			}
			// 改变背景颜色
			var changeBkColor = function(BkColor) {
				initBkColor = BkColor;
				RootContainer.css("background-color",initBkColor);
				Util.StorageSetter("background-color",initBkColor);
			}
			
			// JSONP
			var getJSONP = function(url,callback) {
				return $.jsonp({
					url:url,
					cache:true,
					callback:"duokan_fiction_chapter",
					success:function(result) {
						var data = $.base64.decode(result);
						data = escape(data);
						var json = decodeURIComponent(data);
						//debugger;
						callback(json);
					}
				});
			}
			return {
				StorageGetter:StorageGetter,
				StorageSetter:StorageSetter,
				addHandler:addHandler,
				getEvent:getEvent,
				getTarget:getTarget,
				changeBkColor:changeBkColor,
				getJSONP:getJSONP,
			}
		})();

		// 常量
		var Dom = {
			top_nav: $("#top_nav"),
			foot_nav: $("#foot_nav"),
			font_container: $("#font_container"),
			m_font_bar: $(".m-font-bar"),
			night_day: $("#night_day"),
			light_day: $("#light_day"),
		}
		var Win = $(window);
		var Doc = $(document);
		var readerModel;
		var readerUI;
		// 初始化字体
		var RootContainer = $("#fition_container");
		var initFontSize = Util.StorageGetter("font_size");
		initFontSize = parseInt(initFontSize);
		if (!initFontSize) {
			initFontSize = 14;
		}
		RootContainer.css("font-size",initFontSize);
		// 初始化背景
		var initBkColor = Util.StorageGetter("background-color");
		if (!initBkColor) {
			initBkColor = "#e9dfc7";
		}
		RootContainer.css("background-color",initBkColor);

		function main() {
			//todo 整个项目的入口函数
			readerModel = ReaderModel();
			readerUI = ReaderBaseFrame(RootContainer);
			readerModel.init(function(data) {
				readerUI(data);  // data为章节内容的json字符串
			});
			EventHanlder();
		}

		function ReaderModel() {
			//todo 实现和阅读器相关的数据交互的方法
			
			var Chapter_id;
			var ChapterTotal;

			// 初始化
			var init = function(UIcallback) {
				/*
				getFictionInfo(function() {
					getCurChapterContent(Chapter_id,function(data) {
						//todo 渲染
						UIcallback && UIcallback(data);
					});
				});
				*/
				getFictionInfoPromise().then(function(d) {
					return getCurChapterContentPromise();
				}).then(function(data) {
					UIcallback && UIcallback(data);
				});
			}
			// 获得章节信息（目录）
			var getFictionInfo = function(callback) {
				$.get("data/chapter.json",function(data) {
					//todo 获得章节信息之后的回调
					Chapter_id = Util.StorageGetter("last_chapter_id");
					if (Chapter_id == null) {
						Chapter_id = data.chapters[1].chapter_id;						
					}
					ChapterTotal = data.chapters.length;
					callback && callback();
				},"json");
			}

			var getFictionInfoPromise = function() {
				return new Promise(function(resolve,reject) {
					$.get("data/chapter.json",function(data) {
						//todo 获得章节信息之后的回调
						if (data.result == 0) {
							Chapter_id = Util.StorageGetter("last_chapter_id");
							if (Chapter_id == null) {
								Chapter_id = data.chapters[1].chapter_id;						
							}
							ChapterTotal = data.chapters.length;
							resolve();
						}
						else {
							reject();
						}	
					},"json");
				});
			}
			

			// 获得当前章节的内容
			var getCurChapterContent = function(chapter_id,callback) {
				$.get("data/data" + chapter_id + ".json",function(data) {
					if (data.result == 0) {
						var url = data.jsonp;
						Util.getJSONP(url,function(data) {
							//debugger;
							callback && callback(data);
						});
					}
				},"json");
			}

			var getCurChapterContentPromise = function() {
				return new Promise(function(resolve,reject) {
					$.get("data/data" + Chapter_id + ".json",function(data) {
						if (data.result == 0) {
							var url = data.jsonp;
							Util.getJSONP(url,function(data) {
								//debugger;
								resolve(data);
							});
						}
						else {
							reject({msg:"fail"});
						}
					},"json");
				});
			} 
			
			// 上一章
			var prevChapter = function(UIcallback) {
				Chapter_id = parseInt(Chapter_id,10);
				if (Chapter_id == 0) {
					return;
				}
				Chapter_id -= 1;
				getCurChapterContent(Chapter_id,UIcallback);
				Util.StorageSetter("last_chapter_id",Chapter_id);
				Win.scrollTop(0);
			}
			// 下一章
			var nextChapter = function(UIcallback) {
				Chapter_id = parseInt(Chapter_id,10);
				if (Chapter_id == ChapterTotal) {
					return
				}
				Chapter_id += 1;
				getCurChapterContent(Chapter_id,UIcallback);
				Util.StorageSetter("last_chapter_id",Chapter_id);
				Win.scrollTop(0);
			}

			return {
				init:init,
				getFictionInfo:getFictionInfo,
				getCurChapterContent:getCurChapterContent,
				prevChapter:prevChapter,
				nextChapter:nextChapter,
			}

		}

		function ReaderBaseFrame(container) {
			//todo 渲染基本的UI结构
			function parseChapterData(jsonData) {
				var jsonObj = JSON.parse(jsonData);
				var html = "<h4>" + jsonObj.t + "</h4>";
				for (var i = 0; i < jsonObj.p.length; i++) {
					html += "<p>" + jsonObj.p[i] + "</p>";
				}
				return html;
			}
			return function(data) {
				container.html(parseChapterData(data));
			}
		}

		function EventHanlder() {
			//todo 交互的事件绑定
			
			// 点击中部响应区域，上下边栏显示/隐藏
			$("#action_mid").click(function() {
				if (Dom.top_nav.css("display") == "none") {
					Dom.top_nav.show();
					Dom.foot_nav.show();
				}
				else {
					Dom.top_nav.hide();
					Dom.foot_nav.hide();
					Dom.font_container.hide();
					Dom.m_font_bar.removeClass("current");
				}
			});

			// 屏幕滚动时，隐藏上下边栏
			Win.scroll(function() {
				Dom.top_nav.hide();
				Dom.foot_nav.hide();
				Dom.font_container.hide();
				Dom.m_font_bar.removeClass("current");
			});

			// 点击字体，控制面板显示/隐藏
			Dom.m_font_bar.click(function() {
				if (Dom.font_container.css("display") == "none") {
					Dom.font_container.show();
					Dom.m_font_bar.addClass("current");
				}
				else {
					Dom.font_container.hide();
					Dom.m_font_bar.removeClass("current");
				}
			});

			// 改变字体大小
			$("#large_font").click(function() {
				if (initFontSize > 20) {
					return;
				}
				initFontSize += 1;
				RootContainer.css("font-size",initFontSize);
				Util.StorageSetter("font_size",initFontSize);
			});

			$("#small_font").click(function() {
				if (initFontSize < 12) {
					return;
				}
				initFontSize -= 1;
				RootContainer.css("font-size",initFontSize);
				Util.StorageSetter("font_size",initFontSize);
			});

			// 改变背景颜色
			Util.addHandler($("#color_pannel")[0],"click",function(event) {
				var event = Util.getEvent(event);
				var target = Util.getTarget(event);
				//console.log(target);  // 内层div
				switch(target.id) {
					case "bk-color1":
					Util.changeBkColor("#f7eee5");
					break;
					case "bk-color2":
					Util.changeBkColor("#e9dfc7");
					break;
					case "bk-color3":
					Util.changeBkColor("#a4a4a4");
					break;
					case "bk-color4":
					Util.changeBkColor("#cdefce");
					break;
					case "bk-color5":
					Util.changeBkColor("#283548");
					break;
					default:
					break;
				}
			});

			// 白天/夜间模式切换
			Dom.night_day.click(function() {
				Dom.light_day.show();
				Dom.night_day.hide();
				RootContainer.css("background-color","#283548");
				Util.StorageSetter("background-color","#283548");
			});
			Dom.light_day.click(function() {
				Dom.night_day.show();
				Dom.light_day.hide();
				RootContainer.css("background-color","#e9dfc7");
				Util.StorageSetter("background-color","#e9dfc7");
			});

			// 上下章节切换
			$("#prev_button").click(function() {
				//todo 获得章节的翻页数据->把数据拿出来渲染
				readerModel.prevChapter(function(data) {
					readerUI(data);
				});
			});

			$("#next_button").click(function() {
				readerModel.nextChapter(function(data) {
					readerUI(data);
				});
			})
		}

		main(); 
})();
