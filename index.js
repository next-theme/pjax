const executeScripts = require('./lib/execute-scripts');
const forEachEls = require('./lib/foreach-els');
const parseOptions = require('./lib/parse-options');
const switches = require('./lib/switches');
const newUid = require('./lib/uniqueid');

const on = require('./lib/events/on');
const trigger = require('./lib/events/trigger');

const clone = require('./lib/util/clone');
const contains = require('./lib/util/contains');
const extend = require('./lib/util/extend');
const noop = require('./lib/util/noop');

const Pjax = function(options) {
  this.state = {
    numPendingSwitches: 0,
    href              : null,
    options           : null
  };

  this.options = parseOptions(options);
  this.log('Pjax options', this.options);

  if (this.options.scrollRestoration && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
    on(
      window,
      'beforeunload',
      function() {
        history.scrollRestoration = 'auto';
      }
    );
  }

  this.maxUid = newUid();
  this.lastUid = this.maxUid;

  this.parseDOM(document);

  on(
    window,
    'popstate',
    function(st) {
      if (st.state) {
        const opt = clone(this.options);
        opt.url = st.state.url;
        opt.title = st.state.title;
        // Since state already exists, prevent it from being pushed again
        opt.history = false;
        opt.scrollPos = st.state.scrollPos;
        if (st.state.uid < this.lastUid) {
          opt.backward = true;
        } else {
          opt.forward = true;
        }
        this.lastUid = st.state.uid;

        // @todo implement history cache here, based on uid
        this.loadUrl(st.state.url, opt);
      }
    }.bind(this)
  );
};

Pjax.switches = switches;

Pjax.prototype = {
  log: require('./lib/proto/log'),

  getElements: function(el) {
    return el.querySelectorAll(this.options.elements);
  },

  parseDOM: function(el) {
    const parseElement = require('./lib/proto/parse-element');
    forEachEls(this.getElements(el), parseElement, this);
  },

  refresh: function(el) {
    this.parseDOM(el || document);
  },

  reload: function() {
    window.location.reload();
  },

  attachLink: require('./lib/proto/attach-link'),

  attachForm: require('./lib/proto/attach-form'),

  forEachSelectors: function(cb, context, DOMContext) {
    return require('./lib/foreach-selectors').bind(this)(
      this.options.selectors,
      cb,
      context,
      DOMContext
    );
  },

  switchSelectors: function(selectors, fromEl, toEl, options) {
    return require('./lib/switches-selectors').bind(this)(
      this.options.switches,
      this.options.switchesOptions,
      selectors,
      fromEl,
      toEl,
      options
    );
  },

  latestChance: function(href) {
    window.location = href;
  },

  onSwitch: function() {
    trigger(window, 'resize scroll');

    this.state.numPendingSwitches--;

    // debounce calls, so we only run this once after all switches are finished.
    if (this.state.numPendingSwitches === 0) {
      this.afterAllSwitches();
    }
  },

  loadContent: function(html, options) {
    if (typeof html !== 'string') {
      trigger(document, 'pjax:complete pjax:error', options);

      return;
    }

    const tmpEl = document.implementation.createHTMLDocument('pjax');

    // parse HTML attributes to copy them
    // since we are forced to use documentElement.innerHTML (outerHTML can't be used for <html>)
    const htmlRegex = /<html[^>]+>/gi;
    const htmlAttribsRegex = /\s?[a-z:]+(?:=['"][^'">]+['"])*/gi;
    let matches = html.match(htmlRegex);
    if (matches && matches.length) {
      matches = matches[0].match(htmlAttribsRegex);
      if (matches.length) {
        matches.shift();
        matches.forEach(function(htmlAttrib) {
          const attr = htmlAttrib.trim().split('=');
          if (attr.length === 1) {
            tmpEl.documentElement.setAttribute(attr[0], 'true');
          } else {
            tmpEl.documentElement.setAttribute(attr[0], attr[1].slice(1, -1));
          }
        });
      }
    }

    tmpEl.documentElement.innerHTML = html;
    this.log(
      'load content',
      tmpEl.documentElement.attributes,
      tmpEl.documentElement.innerHTML.length
    );

    // Clear out any focused controls before inserting new page contents.
    if (
      document.activeElement
      && contains(document, this.options.selectors, document.activeElement)
    ) {
      try {
        document.activeElement.blur();
      } catch (e) {} // eslint-disable-line no-empty
    }

    this.switchSelectors(this.options.selectors, tmpEl, document, options);
  },

  abortRequest: require('./lib/abort-request'),

  doRequest: require('./lib/send-request'),

  handleResponse: require('./lib/proto/handle-response'),

  loadUrl: function(href, options) {
    options
      = typeof options === 'object'
        ? extend({}, this.options, options)
        : clone(this.options);

    this.log('load href', href, options);

    // Abort any previous request
    this.abortRequest(this.request);

    trigger(document, 'pjax:send', options);

    // Do the request
    this.request = this.doRequest(
      href,
      options,
      this.handleResponse.bind(this)
    );
  },

  executeScripts: executeScripts,

  afterAllSwitches: function() {
    // FF bug: Won’t autofocus fields that are inserted via JS.
    // This behavior is incorrect. So if theres no current focus, autofocus
    // the last field.
    //
    // http://www.w3.org/html/wg/drafts/html/master/forms.html
    const autofocusEl = [...document.querySelectorAll('[autofocus]')].pop();
    if (autofocusEl && document.activeElement !== autofocusEl) {
      autofocusEl.focus();
    }

    // Execute scripts in document order when DOM have been completely updated
    const scripts = [...document.querySelectorAll('script[data-pjax]')];
    this.options.selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        element.querySelectorAll('script').forEach(script => {
          if (scripts.includes(script)) return;
          scripts.push(script);
        });
      });
    });
    // Sort by document position.
    // https://stackoverflow.com/a/22613028
    scripts.sort((a, b) => {
      // Bitwise AND is required here.
      if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return -1;
    });
    executeScripts(scripts).catch(() => {});

    const state = this.state;

    if (state.options.history) {
      if (!window.history.state) {
        this.maxUid = newUid();
        this.lastUid = this.maxUid;
        window.history.replaceState(
          {
            url      : window.location.href,
            title    : document.title,
            uid      : this.maxUid,
            scrollPos: [0, 0]
          },
          document.title
        );
      }

      // Update browser history
      this.maxUid = newUid();
      this.lastUid = this.maxUid;

      window.history.pushState(
        {
          url      : state.href,
          title    : state.options.title,
          uid      : this.maxUid,
          scrollPos: [0, 0]
        },
        state.options.title,
        state.href
      );
    }

    this.forEachSelectors(function(el) {
      this.parseDOM(el);
    }, this);

    // Fire Events
    trigger(document, 'pjax:complete pjax:success', state.options);

    if (typeof state.options.analytics === 'function') {
      state.options.analytics();
    }

    if (state.options.history) {
      // First parse url and check for hash to override scroll
      const a = document.createElement('a');
      a.href = this.state.href;
      if (a.hash) {
        let name = a.hash.slice(1);
        name = decodeURIComponent(name);

        const target = document.getElementById(name) || document.getElementsByName(name)[0];
        if (target) window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY);
      } else if (state.options.scrollTo !== false) {
        // Scroll page to top on new page load
        if (state.options.scrollTo.length > 1) {
          window.scrollTo(state.options.scrollTo[0], state.options.scrollTo[1]);
        } else {
          window.scrollTo(0, state.options.scrollTo);
        }
      }
    } else if (state.options.scrollRestoration && state.options.scrollPos) {
      window.scrollTo(state.options.scrollPos[0], state.options.scrollPos[1]);
    }

    this.state = {
      numPendingSwitches: 0,
      href              : null,
      options           : null
    };
  }
};

Pjax.isSupported = require('./lib/is-supported');

// arguably could do `if( require("./lib/is-supported")()) {` but that might be a little to simple
if (Pjax.isSupported()) module.exports = Pjax;
// if there isn’t required browser functions, returning stupid api
else {
  const stupidPjax = noop;
  for (const key in Pjax.prototype) {
    if (
      Object.prototype.hasOwnProperty.call(Pjax.prototype, key)
      && typeof Pjax.prototype[key] === 'function'
    ) {
      stupidPjax[key] = noop;
    }
  }

  module.exports = stupidPjax;
}
