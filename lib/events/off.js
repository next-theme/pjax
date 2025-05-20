import forEachEls from "../foreach-els";

export default (els, events, listener, useCapture) => {
  events = typeof events === "string" ? events.split(" ") : events;

  events.forEach(e => {
    forEachEls(els, el => {
      el.removeEventListener(e, listener, useCapture);
    });
  });
};
