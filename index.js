// var executeScripts = require("./lib/execute-scripts");  // unused-var
import forEachEls from "./lib/foreach-els";

import parseOptions from "./lib/parse-options";
import switches from "./lib/switches";
import newUid from "./lib/uniqueid";
import on from "./lib/events/on";
import trigger from "./lib/events/trigger";
import parseElement from "./lib/proto/parse-element";
import attachLink from "./lib/proto/attach-link";
import attachForm from "./lib/proto/attach-form";
import foreachSelectors from "./lib/foreach-selectors";
import switchesSelectors from "./lib/switches-selectors";
import log from "./lib/proto/log";
import abortRequest from "./lib/abort-request";
import doRequest from "./lib/send-request";
import handleResponse from "./lib/proto/handle-response";

class Pjax {
  constructor(options) {
    this.state = {
      numPendingSwitches: 0,
      href: null,
      options: null
    };

    this.options = parseOptions(options);
    this.log("Pjax options", this.options);

    if (this.options.scrollRestoration && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
      on(
        window,
        "beforeunload",
        function() {
          history.scrollRestoration = "auto";
        }
      );
    }

    this.maxUid = this.lastUid = newUid();

    this.parseDOM(document);

    on(
      window,
      "popstate",
      function(st) {
        if (st.state) {
          const opt = { ...this.options };
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
  }

  getElements(el) {
    return el.querySelectorAll(this.options.elements);
  }

  parseDOM(el) {
    forEachEls(this.getElements(el), parseElement, this);
  }

  refresh(el) {
    this.parseDOM(el || document);
  }

  reload() {
    window.location.reload();
  }

  forEachSelectors(cb, context, DOMcontext) {
    return foreachSelectors.bind(this)(
      this.options.selectors,
      cb,
      context,
      DOMcontext
    );
  }

  switchSelectors(selectors, fromEl, toEl, options) {
    return switchesSelectors.bind(this)(
      this.options.switches,
      this.options.switchesOptions,
      selectors,
      fromEl,
      toEl,
      options
    );
  }

  latestChance(href) {
    window.location = href;
  }

  onSwitch() {
    trigger(window, "resize scroll");

    this.state.numPendingSwitches--;

    // debounce calls, so we only run this once after all switches are finished.
    if (this.state.numPendingSwitches === 0) {
      this.afterAllSwitches();
    }
  }

  loadContent(html, options) {
    if (typeof html !== "string") {
      trigger(document, "pjax:complete pjax:error", options);

      return;
    }

    const tmpEl = document.implementation.createHTMLDocument("pjax");

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
          const attr = htmlAttrib.trim().split("=");
          if (attr.length === 1) {
            tmpEl.documentElement.setAttribute(attr[0], true);
          } else {
            tmpEl.documentElement.setAttribute(attr[0], attr[1].slice(1, -1));
          }
        });
      }
    }

    tmpEl.documentElement.innerHTML = html;
    this.log(
      "load content",
      tmpEl.documentElement.attributes,
      tmpEl.documentElement.innerHTML.length
    );

    // Clear out any focused controls before inserting new page contents.
    if (
      document.activeElement &&
      this.options.selectors.some(selector => document.activeElement.closest(selector) !== null)
    ) {
      try {
        document.activeElement.blur();
      } catch (e) {} // eslint-disable-line no-empty
    }

    this.switchSelectors(this.options.selectors, tmpEl, document, options);
  }

  loadUrl(href, options) {
    options =
      typeof options === "object"
        ? { ...this.options, ...options }
        : { ...this.options };

    this.log("load href", href, options);

    // Abort any previous request
    this.abortRequest(this.request);

    trigger(document, "pjax:send", options);

    // Do the request
    this.request = this.doRequest(
      href,
      options,
      this.handleResponse.bind(this)
    );
  }

  executeScripts(elements) {
    elements.forEach(function(element) {
      const code = element.text || element.textContent || element.innerHTML || '';
      const script = document.createElement('script');
      if (element.id) {
        script.id = element.id;
      }
      if (element.className) {
        script.className = element.className;
      }
      if (element.type) {
        script.type = element.type;
      }
      if (element.src) {
        script.src = element.src;
        // Force synchronous loading of peripheral JS.
        script.async = false;
      }
      if (element.dataset.pjax !== undefined) {
        script.dataset.pjax = '';
      }
      if (code !== '') {
        script.appendChild(document.createTextNode(code));
      }
      element.parentNode.replaceChild(script, element);
    });
  }

  afterAllSwitches() {
    // FF bug: Won’t autofocus fields that are inserted via JS.
    // This behavior is incorrect. So if theres no current focus, autofocus
    // the last field.
    //
    // http://www.w3.org/html/wg/drafts/html/master/forms.html
    const autofocusEl = Array.from(document.querySelectorAll("[autofocus]"))
      .pop();
    if (autofocusEl && document.activeElement !== autofocusEl) {
      autofocusEl.focus();
    }

    // execute scripts when DOM have been completely updated
    this.options.selectors.forEach(function(selector) {
      forEachEls(document.querySelectorAll(selector), function(el) {
        // executeScripts(el);
        if (el === 0) ;  // intentially left blank!
      });
    });

    const state = this.state;

    if (state.options.history) {
      if (!window.history.state) {
        this.lastUid = this.maxUid = newUid();
        window.history.replaceState(
          {
            url: window.location.href,
            title: document.title,
            uid: this.maxUid,
            scrollPos: [0, 0]
          },
          document.title
        );
      }

      // Update browser history
      this.lastUid = this.maxUid = newUid();

      window.history.pushState(
        {
          url: state.href,
          title: state.options.title,
          uid: this.maxUid,
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
    trigger(document, "pjax:complete pjax:success", state.options);

    if (typeof state.options.analytics === "function") {
      state.options.analytics();
    }

    if (state.options.history) {
      // First parse url and check for hash to override scroll
      const a = document.createElement("a");
      a.href = this.state.href;
      if (a.hash) {
        let name = a.hash.slice(1);
        name = decodeURIComponent(name);

        let curtop = 0;
        let target =
          document.getElementById(name) || document.getElementsByName(name)[0];
        if (target) {
          // http://stackoverflow.com/questions/8111094/cross-browser-javascript-function-to-find-actual-position-of-an-element-in-page
          if (target.offsetParent) {
            do {
              curtop += target.offsetTop;

              target = target.offsetParent;
            } while (target);
          }
        }
        window.scrollTo(0, curtop);
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
      href: null,
      options: null
    };
  }
}

Pjax.switches = switches;
Pjax.prototype.log = log;
Pjax.prototype.attachLink = attachLink;
Pjax.prototype.attachForm = attachForm;
Pjax.prototype.abortRequest = abortRequest;
Pjax.prototype.doRequest = doRequest;
Pjax.prototype.handleResponse = handleResponse;

export default Pjax;
