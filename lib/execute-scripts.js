import forEachEls from "./foreach-els";
import evalScript from "./eval-script";

// Finds and executes scripts (used for newly added elements)
// Needed since innerHTML does not run scripts
export default el => {
  if (el.tagName.toLowerCase() === "script") {
    evalScript(el);
  }

  forEachEls(el.querySelectorAll("script"), script => {
    if (!script.type || script.type.toLowerCase() === "text/javascript") {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      evalScript(script);
    }
  });
};
