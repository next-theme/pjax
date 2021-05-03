/**
 * Follow
 * https://html.spec.whatwg.org/multipage/scripting.html
 * excluding steps concerning obsoleted attributes
 */

/**
 * JavaScript MIME type strings.
 */
const MIMETypes = [
  'application/ecmascript',
  'application/javascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript'
];

class Script {
  constructor(scriptEle) {
    this.evaluable = false;
    this.external = false;

    this.target = scriptEle;

    // Process empty
    if (!scriptEle.hasAttribute('src') && !scriptEle.text) return;

    // Process type
    const typeString = scriptEle.type ? scriptEle.type.trim() : 'text/javascript';
    if (MIMETypes.includes(typeString)) {
      this.type = 'classic';
    } else if (typeString === 'module') {
      this.type = 'module';
    } else {
      return;
    }

    // Process no module
    if (scriptEle.noModule && this.type === 'classic') {
      return;
    }

    // Process external
    if (scriptEle.hasAttribute('src')) {
      const src = scriptEle.getAttribute('src');

      // An empty src attribute not results in external status
      // and the script is not executable
      if (!src) return;

      this.external = true;

      try {
        // eslint-disable-next-line no-new
        new URL(src, document.URL);
      } catch {
        return;
      }
    }

    // Process blocking
    this.blocking = this.type === 'classic'
      && (!this.external || (!this.target.async && !this.target.defer));

    this.evaluable = true;
  }

  eval() {
    return new Promise((resolve, reject) => {
      if (!this.evaluable) resolve();

      const oldEle = this.target;
      const newEle = document.createElement('script');

      newEle.onerror = reject;

      // Clone attributes and inner text
      Object.values(oldEle.attributes).forEach(attr => {
        newEle.setAttributeNode(attr.cloneNode(true));
      });
      newEle.text = oldEle.text;

      if (this.external) {
        // Reset async of external scripts to force synchronous loading
        // Needed since it defaults to true on dynamically injected scripts
        if (!newEle.hasAttribute('async')) newEle.async = false;

        newEle.onload = resolve;
      }

      // Execute
      if (document.contains(oldEle)) {
        oldEle.replaceWith(newEle);
      } else {
        document.head.appendChild(newEle);
        newEle.remove();
      }

      if (!this.external) resolve();
    });
  }
}

module.exports = Script;
