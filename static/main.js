// Generated by CoffeeScript 1.9.0
var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

define(['base/js/namespace', 'jquery', 'components/es6-promise/promise.min', 'thebe/dotimeout', 'notebook/js/notebook', 'thebe/jquery-cookie', 'thebe/default_css', 'contents', 'services/config', 'base/js/utils', 'base/js/page', 'base/js/events', 'notebook/js/actions', 'notebook/js/kernelselector', 'services/kernels/kernel', 'codemirror/lib/codemirror', 'codemirror/mode/ruby/ruby', 'custom/custom'], function(IPython, $, promise, doTimeout, notebook, jqueryCookie, default_css, contents, configmod, utils, page, events, actions, kernelselector, kernel, CodeMirror, custom) {
  var Thebe;
  promise.polyfill();
  Thebe = (function() {
    Thebe.prototype.default_options = {
      selector: 'pre[data-executable]',
      url: '//192.168.59.103:8000/',
      tmpnb_mode: true,
      kernel_name: "python2",
      append_kernel_controls_to: false,
      inject_css: true,
      load_css: true,
      load_mathjax: true,
      next_cell_shortcut: 32,
      run_cell_shortcut: 13,
      not_executable_selector: "pre[data-not-executable]",
      read_only_selector: "pre[data-read-only]",
      error_addendum: true,
      add_interrupt_button: false,
      codemirror_mode_name: "ipython",
      debug: false
    };

    Thebe.prototype.spawn_path = "api/spawn/";

    Thebe.prototype.stats_path = "stats";

    Thebe.prototype.start_state = "start";

    Thebe.prototype.idle_state = "idle";

    Thebe.prototype.busy_state = "busy";

    Thebe.prototype.ran_state = "ran";

    Thebe.prototype.full_state = "full";

    Thebe.prototype.cant_state = "cant";

    Thebe.prototype.disc_state = "disconnected";

    Thebe.prototype.gaveup_state = "gaveup";

    Thebe.prototype.user_error = "user_error";

    Thebe.prototype.interrupt_state = "interrupt";

    Thebe.prototype.ui = {};

    Thebe.prototype.setup_constants = function() {
      this.error_states = [this.disc_state, this.full_state, this.cant_state, this.gaveup_state];
      this.ui[this.start_state] = 'Starting server...';
      this.ui[this.idle_state] = 'Run';
      this.ui[this.busy_state] = 'Working <div class="thebe-spinner thebe-spinner-three-bounce"><div></div> <div></div> <div></div></div>';
      this.ui[this.ran_state] = 'Run Again';
      this.ui[this.user_error] = 'Run Again';
      this.ui[this.interrupt_state] = 'Interrupted. Run Again?';
      this.ui[this.full_state] = 'Server is Full :-(';
      this.ui[this.cant_state] = 'Can\'t connect to server';
      this.ui[this.disc_state] = 'Disconnected from Server<br>Attempting to reconnect';
      this.ui[this.gaveup_state] = 'Disconnected!<br>Click to try again';
      if (this.options.error_addendum === false) {
        return this.ui['error_addendum'] = "";
      } else if (this.options.error_addendum === true) {
        return this.ui['error_addendum'] = "<button data-action='run-above'>Run All Above</button> <div class='thebe-message'>It looks like there was an error. You might need to run the code examples above for this one to work.</div>";
      } else {
        return this.ui['error_addendum'] = this.options.error_addendum;
      }
    };

    function Thebe(_at_options) {
      var thebe_url, _ref;
      this.options = _at_options != null ? _at_options : {};
      this.track = __bind(this.track, this);
      this.setup_resources = __bind(this.setup_resources, this);
      this.start_notebook = __bind(this.start_notebook, this);
      this.start_kernel = __bind(this.start_kernel, this);
      this.before_first_run = __bind(this.before_first_run, this);
      this.run_cell = __bind(this.run_cell, this);
      this.get_controls_html = __bind(this.get_controls_html, this);
      this.controls_html = __bind(this.controls_html, this);
      this.show_cell_state = __bind(this.show_cell_state, this);
      this.set_state = __bind(this.set_state, this);
      this.build_thebe = __bind(this.build_thebe, this);
      this.spawn_handler = __bind(this.spawn_handler, this);
      this.call_spawn = __bind(this.call_spawn, this);
      this.has_kernel_connected = false;
      this.server_error = false;
      _ref = _.defaults(this.options, this.default_options), this.selector = _ref.selector, this.url = _ref.url, this.debug = _ref.debug;
      this.setup_constants();
      if (this.url) {
        this.url = this.url.replace(/\/?$/, '/');
      }
      if (this.url.slice(0, 2) === '//') {
        this.url = window.location.protocol + this.url;
      }
      if (this.options.tmpnb_mode) {
        this.log('Thebe is in tmpnb mode');
        this.tmpnb_url = this.url;
        this.url = '';
      }
      this.cells = [];
      this.events = events;
      this.setup_resources();
      this.setup_user_events();
      thebe_url = $.cookie('thebe_url');
      if (thebe_url && this.url === '') {
        this.check_existing_container(thebe_url);
      }
      if (this.tmpnb_url) {
        this.check_server();
      }
      this.start_notebook();
    }

    Thebe.prototype.call_spawn = function(cb) {
      var invo, _ref;
      this.log('call spawn');
      this.track('call_spawn');
      if ((_ref = this.kernel) != null ? _ref.ws : void 0) {
        this.log('HAZ WEBSOCKET?');
      }
      invo = new XMLHttpRequest;
      invo.open('POST', this.tmpnb_url + this.spawn_path, true);
      invo.onreadystatechange = (function(_this) {
        return function(e) {
          if (invo.readyState === 4) {
            return _this.spawn_handler(e, cb);
          }
        };
      })(this);
      invo.onerror = (function(_this) {
        return function(e) {
          _this.log("Cannot connect to tmpnb server", true);
          _this.set_state(_this.cant_state);
          $.removeCookie('thebe_url');
          return _this.track('call_spawn_fail');
        };
      })(this);
      return invo.send();
    };

    Thebe.prototype.check_server = function(invo) {
      if (invo == null) {
        invo = new XMLHttpRequest;
      }
      invo.open('GET', this.tmpnb_url + this.stats_path, true);
      invo.onerror = (function(_this) {
        return function(e) {
          _this.track('check_server_error');
          _this.log('Checked and cannot connect to tmpnb server!' + e.target.status, true);
          _this.server_error = true;
          return $('.thebe_controls').remove();
        };
      })(this);
      invo.onload = (function(_this) {
        return function(e) {
          return _this.log('Tmpnb server seems to be up');
        };
      })(this);
      return invo.send();
    };

    Thebe.prototype.check_existing_container = function(url, invo) {
      if (invo == null) {
        invo = new XMLHttpRequest;
      }
      invo.open('GET', url + 'api', true);
      invo.onerror = (function(_this) {
        return function(e) {
          $.removeCookie('thebe_url');
          return _this.log('server error when checking existing container');
        };
      })(this);
      invo.onload = (function(_this) {
        return function(e) {
          try {
            JSON.parse(e.target.responseText);
            _this.url = url;
            return _this.log('cookie with notebook server url was right, use as needed');
          } catch (_error) {
            $.removeCookie('thebe_url');
            return _this.log('cookie was wrong/outdated, call spawn as needed');
          }
        };
      })(this);
      return invo.send();
    };

    Thebe.prototype.spawn_handler = function(e, cb) {
      var data, _ref;
      this.log('spawn handler called');
      if ((_ref = e.target.status) === 0 || _ref === 405) {
        this.log('Cannot connect to tmpnb server, status: ' + e.target.status, true);
        return this.set_state(this.cant_state);
      } else {
        try {
          data = JSON.parse(e.target.responseText);
        } catch (_error) {
          this.log(data);
          this.log("Couldn't parse spawn response");
          this.track('call_spawn_error');
        }
        if (data.status === 'full') {
          this.log('tmpnb server full', true);
          this.set_state(this.full_state);
          return this.track('call_spawn_full');
        } else {
          this.url = this.tmpnb_url + data.url + '/';
          this.log('tmpnb says we should use');
          this.log(this.url);
          this.start_kernel(cb);
          $.cookie('thebe_url', this.url);
          return this.track('call_spawn_success');
        }
      }
    };

    Thebe.prototype.build_thebe = function() {
      var focus_edit_flag, get_cell_id_from_event;
      this.notebook.writable = false;
      this.notebook._unsafe_delete_cell(0);
      $(this.selector).add(this.options.not_executable_selector).each((function(_this) {
        return function(i, el) {
          var cell, controls, original_id, wrap;
          cell = _this.notebook.insert_cell_at_bottom('code');
          original_id = $(el).attr('id');
          cell.set_text($(el).text().trim());
          if ($(el).is(_this.options.read_only_selector)) {
            cell.read_only = true;
            cell.code_mirror.setOption("readOnly", true);
          }
          wrap = $("<div class='thebe_wrap'></div>");
          controls = $("<div class='thebe_controls' data-cell-id='" + i + "'>" + (_this.controls_html()) + "</div>");
          wrap.append(cell.element.children());
          $(el).replaceWith(cell.element.empty().append(wrap));
          _this.cells.push(cell);
          if (!_this.server_error) {
            $(wrap).append(controls);
          }
          if ($(el).is(_this.options.not_executable_selector)) {
            controls.html("");
          }
          if (original_id) {
            cell.element.attr('id', original_id);
          }
          cell.element.removeAttr('tabindex');
          return cell.element.off('dblclick');
        };
      })(this));
      this.notebook_el.hide();
      focus_edit_flag = false;
      this.events.on('edit_mode.Cell', (function(_this) {
        return function(e, c) {
          return focus_edit_flag = true;
        };
      })(this));
      get_cell_id_from_event = function(e) {
        return $(e.currentTarget).find('.thebe_controls').data('cell-id');
      };
      $('div.code_cell').on('keydown', (function(_this) {
        return function(e) {
          var cell_id, next;
          if (e.which === _this.options.next_cell_shortcut && e.shiftKey === true) {
            cell_id = get_cell_id_from_event(e);
            if (cell_id === _this.cells.length - 1) {
              cell_id = -1;
            }
            next = _this.cells[cell_id + 1];
            next.focus_editor();
            return false;
          } else if (e.which === _this.options.run_cell_shortcut && e.shiftKey === true) {
            cell_id = get_cell_id_from_event(e);
            _this.run_cell(cell_id);
            return false;
          } else if (focus_edit_flag) {
            cell_id = get_cell_id_from_event(e);
            _this.track('cell_edit', {
              cell_id: cell_id
            });
            focus_edit_flag = false;
          }
          return true;
        };
      })(this));
      $(window).on('keydown', (function(_this) {
        return function(e) {
          if (e.which === 67 && e.ctrlKey) {
            return _this.kernel.interrupt();
          }
        };
      })(this));
      this.events.on('kernel_connected.Kernel', (function(_this) {
        return function() {
          var cell, id, _i, _len, _ref, _results;
          if (_this.has_kernel_connected === '') {
            _ref = _this.cells;
            _results = [];
            for (id = _i = 0, _len = _ref.length; _i < _len; id = ++_i) {
              cell = _ref[id];
              _results.push(_this.show_cell_state(_this.idle_state, id));
            }
            return _results;
          }
        };
      })(this));
      this.events.on('kernel_idle.Kernel', (function(_this) {
        return function() {
          _this.set_state(_this.idle_state);
          return $.doTimeout('thebe_idle_state', 300, function() {
            var busy_ids, id, interrupt_ids, _i, _j, _len, _len1, _ref;
            if (_this.state === _this.idle_state) {
              busy_ids = $(".thebe_controls button[data-state='busy']").parent().map(function() {
                return $(this).data('cell-id');
              });
              for (_i = 0, _len = busy_ids.length; _i < _len; _i++) {
                id = busy_ids[_i];
                _this.show_cell_state(_this.idle_state, id);
              }
              interrupt_ids = $(".thebe_controls button[data-state='interrupt']").parent().map(function() {
                return $(this).data('cell-id');
              });
              for (_j = 0, _len1 = interrupt_ids.length; _j < _len1; _j++) {
                id = interrupt_ids[_j];
                _this.cells[id]["output_area"].clear_output(false);
              }
              return false;
            } else if (_ref = _this.state, __indexOf.call(_this.error_states, _ref) < 0) {
              return true;
            } else {
              return false;
            }
          });
        };
      })(this));
      this.events.on('kernel_busy.Kernel', (function(_this) {
        return function() {
          return _this.set_state(_this.busy_state);
        };
      })(this));
      this.events.on('kernel_reconnecting.Kernel', (function(_this) {
        return function(e, data) {
          var time;
          _this.log('Reconnect attempt #' + data.attempt);
          if (data.attempt < 5) {
            time = Math.pow(2, data.attempt);
            return _this.set_state(_this.disc_state, time);
          } else {
            return _this.set_state(_this.gaveup_state);
          }
        };
      })(this));
      return this.events.on('output_message.OutputArea', (function(_this) {
        return function(e, msg_type, msg, output_area) {
          var controls, id;
          controls = $(output_area.element).parents('.code_cell').find('.thebe_controls');
          id = controls.data('cell-id');
          if (msg_type === 'error') {
            _this.log('Error executing cell #' + id);
            if (msg.content.ename === "KeyboardInterrupt") {
              _this.log("KeyboardInterrupt by User");
              return _this.show_cell_state(_this.interrupt_state, id);
            } else {
              return _this.show_cell_state(_this.user_error, id);
            }
          }
        };
      })(this));
    };

    Thebe.prototype.set_state = function(_at_state, reconnect_time) {
      var html, _ref;
      this.state = _at_state;
      if (reconnect_time == null) {
        reconnect_time = '';
      }
      this.log('Thebe: ' + this.state);
      if (_ref = this.state, __indexOf.call(this.error_states, _ref) >= 0) {
        html = this.ui[this.state];
        if (reconnect_time) {
          html += " in " + reconnect_time + " seconds";
        }
        $(".thebe_controls").html(this.controls_html(this.state, html));
        if (this.state === this.disc_state) {
          return $(".thebe_controls button").prop('disabled', true);
        }
      }
    };

    Thebe.prototype.show_cell_state = function(state, cell_id) {
      this.set_state(state);
      this.log('show cell state: ' + state + ' for ' + cell_id);
      if (this.cells[cell_id]['last_msg_id'] && state === this.idle_state) {
        state = this.ran_state;
      }
      return $(".thebe_controls[data-cell-id=" + cell_id + "]").html(this.controls_html(state));
    };

    Thebe.prototype.controls_html = function(state, html) {
      var result;
      if (state == null) {
        state = this.idle_state;
      }
      if (html == null) {
        html = false;
      }
      if (!html) {
        html = this.ui[state];
      }
      result = "<button data-action='run' data-state='" + state + "'>" + html + "</button>";
      if (this.options.add_interrupt_button && state === this.busy_state) {
        result += "<button data-action='interrupt'>Interrupt</button>";
      }
      if (state === this.user_error) {
        result += this.ui["error_addendum"];
      }
      return result;
    };

    Thebe.prototype.get_controls_html = function(cell) {
      return $(cell.element).find(".thebe_controls").html();
    };

    Thebe.prototype.kernel_controls_html = function() {
      return "<button data-action='run-above'>Run All</button> <button data-action='interrupt'>Interrupt</button> <button data-action='restart'>Restart</button>";
    };

    Thebe.prototype.run_cell = function(cell_id, end_id) {
      var cell, i, _i, _len, _ref, _ref1, _ref2, _results;
      if (end_id == null) {
        end_id = false;
      }
      this.track('run_cell', {
        cell_id: cell_id,
        end_id: end_id
      });
      if ((_ref = this.state) === this.gaveup_state || _ref === this.cant_state) {
        this.log('Lets reconnect thebe to the server');
        this.has_kernel_connected = '';
        this.url = '';
      } else if (_ref1 = this.state, __indexOf.call(this.error_states.concat(this.start_state), _ref1) >= 0) {
        this.log('Not attempting to reconnect thebe to server, state: ' + this.state);
        return;
      }
      cell = this.cells[cell_id];
      if (!this.get_controls_html(cell)) {
        return;
      }
      if (!this.has_kernel_connected) {
        this.show_cell_state(this.start_state, cell_id);
        return this.before_first_run((function(_this) {
          return function() {
            var i, _i, _len, _ref2, _results;
            _this.show_cell_state(_this.busy_state, cell_id);
            cell.execute();
            if (end_id) {
              _ref2 = _this.cells.slice(cell_id + 1, +end_id + 1 || 9e9);
              _results = [];
              for (i = _i = 0, _len = _ref2.length; _i < _len; i = ++_i) {
                cell = _ref2[i];
                if (!_this.get_controls_html(cell)) {
                  continue;
                }
                _this.show_cell_state(_this.busy_state, i + 1);
                _results.push(cell.execute());
              }
              return _results;
            }
          };
        })(this));
      } else {
        this.show_cell_state(this.busy_state, cell_id);
        cell.execute();
        if (end_id) {
          _ref2 = this.cells.slice(cell_id + 1, +end_id + 1 || 9e9);
          _results = [];
          for (i = _i = 0, _len = _ref2.length; _i < _len; i = ++_i) {
            cell = _ref2[i];
            if (!this.get_controls_html(cell)) {
              continue;
            }
            this.show_cell_state(this.busy_state, i + 1);
            _results.push(cell.execute());
          }
          return _results;
        }
      }
    };

    Thebe.prototype.before_first_run = function(cb) {
      var kernel_controls;
      if (this.url) {
        this.start_kernel(cb);
      } else {
        this.call_spawn(cb);
      }
      if (this.options.append_kernel_controls_to && !$('.kernel_controls').length) {
        kernel_controls = $("<div class='kernel_controls'></div>");
        return kernel_controls.html(this.kernel_controls_html()).appendTo(this.options.append_kernel_controls_to);
      }
    };

    Thebe.prototype.setup_user_events = function() {
      return $('body').on('click', 'div.thebe_controls button, div.kernel_controls button', (function(_this) {
        return function(e) {
          var action, button, id;
          button = $(e.currentTarget);
          id = button.parent().data('cell-id');
          action = button.data('action');
          if (e.shiftKey) {
            action = 'shift-' + action;
          }
          switch (action) {
            case 'run':
              return _this.run_cell(id);
            case 'shift-run':
            case 'run-above':
              if (!id) {
                id = _this.cells.length;
              }
              _this.log('exec from top to cell #' + id);
              return _this.run_cell(0, id);
            case 'interrupt':
              return _this.kernel.interrupt();
            case 'restart':
              if (confirm('Are you sure you want to restart the kernel? Your work will be lost.')) {
                return _this.kernel.restart();
              }
          }
        };
      })(this));
    };

    Thebe.prototype.start_kernel = function(cb) {
      this.log('start_kernel with ' + this.url);
      this.kernel = new kernel.Kernel(this.url + 'api/kernels', '', this.notebook, this.options.kernel_name);
      this.kernel.start();
      this.notebook.kernel = this.kernel;
      return this.events.on('kernel_ready.Kernel', (function(_this) {
        return function() {
          var cell, i, _i, _len, _ref;
          _this.has_kernel_connected = true;
          _this.log('kernel ready');
          _ref = _this.cells;
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            cell = _ref[i];
            cell.set_kernel(_this.kernel);
          }
          return cb();
        };
      })(this));
    };

    Thebe.prototype.start_notebook = function() {
      var common_options, config_section, keyboard_manager, save_widget;
      contents = {
        list_checkpoints: function() {
          return new Promise(function(resolve, reject) {
            return resolve({});
          });
        }
      };
      keyboard_manager = {
        edit_mode: function() {},
        command_mode: function() {},
        register_events: function() {},
        enable: function() {},
        disable: function() {}
      };
      keyboard_manager.edit_shortcuts = {
        handles: function() {}
      };
      save_widget = {
        update_document_title: function() {},
        contents: function() {}
      };
      config_section = {
        data: {
          data: {}
        }
      };
      common_options = {
        ws_url: '',
        base_url: '',
        notebook_path: '',
        notebook_name: ''
      };
      this.notebook_el = $('<div id="notebook"></div>').prependTo('body');
      this.notebook = new notebook.Notebook('div#notebook', $.extend({
        events: this.events,
        keyboard_manager: keyboard_manager,
        save_widget: save_widget,
        contents: contents,
        config: config_section
      }, common_options));
      this.notebook.kernel_selector = {
        set_kernel: function() {}
      };
      this.events.trigger('app_initialized.NotebookApp');
      this.notebook.load_notebook(common_options.notebook_path, this.options.codemirror_mode_name);
      return this.build_thebe();
    };

    Thebe.prototype.setup_resources = function() {
      var script, urls;
      window.mathjax_url = '';
      if (this.options.load_mathjax) {
        script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "//cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML";
        document.getElementsByTagName("head")[0].appendChild(script);
      }
      if (this.options.inject_css) {
        $("<style>" + default_css.css + "</style>").appendTo('head');
      }
      if (this.options.load_css) {
        urls = ["https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.11.2/jquery-ui.min.css"];
        $.when($.each(urls, function(i, url) {
          return $.get(url, function() {
            return $('<link>', {
              rel: 'stylesheet',
              type: 'text/css',
              'href': url
            }).appendTo('head');
          });
        }));
      }
      return $(document).ajaxError((function(_this) {
        return function(event, jqxhr, settings, thrownError) {
          var server_url;
          server_url = _this.options.tmpnb_mode ? _this.tmpnb_url : _this.url;
          if (settings.url.indexOf(server_url) !== -1) {
            _this.log("Ajax Error!");
            return _this.set_state(_this.disc_state);
          }
        };
      })(this));
    };

    Thebe.prototype.log = function(m, serious) {
      if (serious == null) {
        serious = false;
      }
      if (this.debug) {
        if (!serious) {
          return console.log(m);
        } else {
          return console.log("%c" + m, "color: blue; font-size: 12px");
        }
      } else if (serious) {
        return console.log(m);
      }
    };

    Thebe.prototype.track = function(name, data) {
      if (data == null) {
        data = {};
      }
      data['name'] = name;
      data['kernel'] = this.options.kernel_name;
      if (this.server_error) {
        data['server_error'] = true;
      }
      if (this.has_kernel_connected) {
        data['has_kernel_connected'] = true;
      }
      return $(window.document).trigger('thebe_tracking_event', data);
    };

    return Thebe;

  })();
  window.Thebe = Thebe;
  $(function() {
    var thebe;
    if ($('body').data('runnable')) {
      return thebe = new Thebe();
    }
  });
  return {
    Thebe: Thebe
  };
});
