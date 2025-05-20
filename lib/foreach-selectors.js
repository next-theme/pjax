import forEachEls from "./foreach-els";

export default (selectors, cb, context, DOMcontext = document) => {
  selectors.forEach(selector => {
    forEachEls(DOMcontext.querySelectorAll(selector), cb, context);
  });
};
