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
  static isClassic(scriptEle) {
    return !scriptEle.type || MIMETypes
      .includes(scriptEle.type.trim().toLowerCase());
  }

  static isModule(scriptEle) {
    return scriptEle.type.trim().toLowerCase() === 'module';
  }

  static isValid(scriptEle) {
    return this.isClassic(scriptEle) || this.isModule(scriptEle);
  }

  static isExternal(scriptEle) {
    return !!scriptEle.src;
  }

  constructor(scriptEle) {
    this.evaluable = false;
    this.target = scriptEle;

    // Process empty
    if (!scriptEle.src && !scriptEle.text) return;

    // Process type
    if (this.constructor.isClassic(scriptEle)) {
      this.type = 'classic';
    } else if (this.constructor.isModule(scriptEle)) {
      this.type = 'module';
    } else {
      return;
    }

    // Process no module
    if (scriptEle.noModule && this.type === 'classic') {
      return;
    }

    // Process src
    if (this.constructor.isExternal(scriptEle)) {
      this.external = true;
      try {
        // eslint-disable-next-line no-new
        new URL(scriptEle.src, document.URL);
      } catch {
        return;
      }
    } else {
      this.external = false;
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
      try {
        oldEle.replaceWith(newEle);
      } catch (e) {
        reject(e);
      }

      if (!this.external) resolve();
    });
  }
}

module.exports = Script;
