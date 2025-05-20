import forEachEls from "../foreach-els";

export default (els, events, opts) => {
  events = typeof events === "string" ? events.split(" ") : events;

  events.forEach(e => {
    const event = document.createEvent("HTMLEvents");
    event.initEvent(e, true, true);
    event.eventName = e;
    if (opts) {
      Object.keys(opts).forEach(key => {
        event[key] = opts[key];
      });
    }

    forEachEls(els, el => {
      let domFix = false;
      if (!el.parentNode && el !== document && el !== window) {
        // THANK YOU IE (9/10/11)
        // dispatchEvent doesn't work if the element is not in the DOM
        domFix = true;
        document.body.appendChild(el);
      }
      el.dispatchEvent(event);
      if (domFix) {
        el.parentNode.removeChild(el);
      }
    });
  });
};
