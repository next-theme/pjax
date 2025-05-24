import on from "../events/on";

const attrState = "data-pjax-state";

const linkAction = function(el, event) {
  if (isDefaultPrevented(event)) {
    return;
  }

  // Since loadUrl modifies options and we may add our own modifications below,
  // clone it so the changes don't persist
  const options = { ...this.options };

  const attrValue = checkIfShouldAbort(el, event);
  if (attrValue) {
    el.setAttribute(attrState, attrValue);
    return;
  }

  event.preventDefault();

  // don’t do "nothing" if user try to reload the page by clicking the same link twice
  if (
    this.options.currentUrlFullReload &&
    el.href === window.location.href.split("#")[0]
  ) {
    el.setAttribute(attrState, "reload");
    this.reload();
    return;
  }

  el.setAttribute(attrState, "load");

  options.triggerElement = el;
  this.loadUrl(el.href, options);
};

function checkIfShouldAbort({protocol, host, hash, href}, event) {
  // Don’t break browser special behavior on links (like page in new window)
  if (
    event.which > 1 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return "modifier";
  }

  // we do test on href now to prevent unexpected behavior if for some reason
  // user have href that can be dynamically updated

  // Ignore external links.
  if (
    protocol !== window.location.protocol ||
    host !== window.location.host
  ) {
    return "external";
  }

  // Ignore anchors on the same page (keep native behavior)
  if (
    hash &&
    href.replace(hash, "") ===
      window.location.href.replace(location.hash, "")
  ) {
    return "anchor";
  }

  // Ignore empty anchor "foo.html#"
  if (href === `${window.location.href.split("#")[0]}#`) {
    return "anchor-empty";
  }
}

var isDefaultPrevented = ({defaultPrevented, returnValue}) => {
  return defaultPrevented || returnValue === false;
};

export default function(el) {
  const that = this;

  el.setAttribute(attrState, "");

  on(el, "click", event => {
    linkAction.call(that, el, event);
  });

  on(
    el,
    "keyup",
    event => {
      if (event.keyCode === 13) {
        linkAction.call(that, el, event);
      }
    }
  );
}
