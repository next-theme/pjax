import on from "../events/on";
import clone from "../util/clone";

const attrState = "data-pjax-state";

const formAction = function(el, event) {
  if (isDefaultPrevented(event)) {
    return;
  }

  // Since loadUrl modifies options and we may add our own modifications below,
  // clone it so the changes don't persist
  const options = clone(this.options);

  // Initialize requestOptions
  options.requestOptions = {
    requestUrl: el.getAttribute("action") || window.location.href,
    requestMethod: el.getAttribute("method") || "GET"
  };

  // create a testable virtual link of the form action
  const virtLinkElement = document.createElement("a");
  virtLinkElement.setAttribute("href", options.requestOptions.requestUrl);

  const attrValue = checkIfShouldAbort(virtLinkElement, options);
  if (attrValue) {
    el.setAttribute(attrState, attrValue);
    return;
  }

  event.preventDefault();

  if (el.enctype === "multipart/form-data") {
    options.requestOptions.formData = new FormData(el);
  } else {
    options.requestOptions.requestParams = parseFormElements(el);
  }

  el.setAttribute(attrState, "submit");

  options.triggerElement = el;
  this.loadUrl(virtLinkElement.href, options);
};

function parseFormElements({elements}) {
  const requestParams = [];
  const formElements = elements;

  for (const element of formElements) {
    const tagName = element.tagName.toLowerCase();
    // jscs:disable disallowImplicitTypeConversion
    if (
      !!element.name &&
      element.attributes !== undefined &&
      tagName !== "button"
    ) {
      // jscs:enable disallowImplicitTypeConversion
      const type = element.attributes.type;

      if (
        !type ||
        (type.value !== "checkbox" && type.value !== "radio") ||
        element.checked
      ) {
        // Build array of values to submit
        const values = [];

        if (tagName === "select") {
          let opt;

          for (let j = 0; j < element.options.length; j++) {
            opt = element.options[j];
            if (opt.selected && !opt.disabled) {
              values.push(opt.hasAttribute("value") ? opt.value : opt.text);
            }
          }
        } else {
          values.push(element.value);
        }

        for (let k = 0; k < values.length; k++) {
          requestParams.push({
            name: encodeURIComponent(element.name),
            value: encodeURIComponent(values[k])
          });
        }
      }
    }
  }

  return requestParams;
}

function checkIfShouldAbort({protocol, host, hash, href}, {currentUrlFullReload}) {
  // Ignore external links.
  if (
    protocol !== window.location.protocol ||
    host !== window.location.host
  ) {
    return "external";
  }

  // Ignore click if we are on an anchor on the same page
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

  // if declared as a full reload, just normally submit the form
  if (
    currentUrlFullReload &&
    href === window.location.href.split("#")[0]
  ) {
    return "reload";
  }
}

var isDefaultPrevented = ({defaultPrevented, returnValue}) => {
  return defaultPrevented || returnValue === false;
};

export default function(el) {
  const that = this;

  el.setAttribute(attrState, "");

  on(el, "submit", event => {
    formAction.call(that, el, event);
  });
}
