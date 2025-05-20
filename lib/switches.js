import on from "./events/on";

export default {
  outerHTML(oldEl, {outerHTML}) {
    oldEl.outerHTML = outerHTML;
    this.onSwitch();
  },

  innerHTML(oldEl, {innerHTML, className}) {
    oldEl.innerHTML = innerHTML;

    if (className === "") {
      oldEl.removeAttribute("class");
    } else {
      oldEl.className = className;
    }

    this.onSwitch();
  },

  switchElementsAlt(oldEl, newEl) {
    oldEl.innerHTML = newEl.innerHTML;

    // Copy attributes from the new element to the old one
    if (newEl.hasAttributes()) {
      const attrs = newEl.attributes;
      for (let i = 0; i < attrs.length; i++) {
        oldEl.attributes.setNamedItem(attrs[i].cloneNode());
      }
    }

    this.onSwitch();
  },

  // Equivalent to outerHTML(), but doesn't require switchElementsAlt() for <head> and <body>
  replaceNode(oldEl, newEl) {
    oldEl.parentNode.replaceChild(newEl, oldEl);
    this.onSwitch();
  },

  sideBySide(oldEl, {childNodes, className}, {backward}, switchOptions) {
    const forEach = Array.prototype.forEach;
    let elsToRemove = [];
    let elsToAdd = [];
    const fragToAppend = document.createDocumentFragment();
    const animationEventNames =
      "animationend webkitAnimationEnd MSAnimationEnd oanimationend";
    let animatedElsNumber = 0;
    const sexyAnimationEnd = ({target, currentTarget}) => {
      if (target !== currentTarget) {
        // end triggered by an animation on a child
        return;
      }

      animatedElsNumber--;
      if (animatedElsNumber <= 0 && elsToRemove) {
        elsToRemove.forEach(el => {
          // browsing quickly can make the el
          // already removed by last page update ?
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
        });

        elsToAdd.forEach(el => {
          el.className = el.className.replace(
            el.getAttribute("data-pjax-classes"),
            ""
          );
          el.removeAttribute("data-pjax-classes");
        });

        elsToAdd = null; // free memory
        elsToRemove = null; // free memory

        // this is to trigger some repaint (example: picturefill)
        this.onSwitch();
      }
    };

    switchOptions = switchOptions || {};

    forEach.call(oldEl.childNodes, el => {
      elsToRemove.push(el);
      if (el.classList && !el.classList.contains("js-Pjax-remove")) {
        // for fast switch, clean element that just have been added, & not cleaned yet.
        if (el.hasAttribute("data-pjax-classes")) {
          el.className = el.className.replace(
            el.getAttribute("data-pjax-classes"),
            ""
          );
          el.removeAttribute("data-pjax-classes");
        }
        el.classList.add("js-Pjax-remove");
        if (switchOptions.callbacks && switchOptions.callbacks.removeElement) {
          switchOptions.callbacks.removeElement(el);
        }
        if (switchOptions.classNames) {
          el.className +=
            ` ${switchOptions.classNames.remove} ${backward
  ? switchOptions.classNames.backward
  : switchOptions.classNames.forward}`;
        }
        animatedElsNumber++;
        on(el, animationEventNames, sexyAnimationEnd, true);
      }
    });

    forEach.call(childNodes, el => {
      if (el.classList) {
        let addClasses = "";
        if (switchOptions.classNames) {
          addClasses =
            ` js-Pjax-add ${switchOptions.classNames.add} ${backward
  ? switchOptions.classNames.forward
  : switchOptions.classNames.backward}`;
        }
        if (switchOptions.callbacks && switchOptions.callbacks.addElement) {
          switchOptions.callbacks.addElement(el);
        }
        el.className += addClasses;
        el.setAttribute("data-pjax-classes", addClasses);
        elsToAdd.push(el);
        fragToAppend.appendChild(el);
        animatedElsNumber++;
        on(el, animationEventNames, sexyAnimationEnd, true);
      }
    });

    // pass all className of the parent
    oldEl.className = className;
    oldEl.appendChild(fragToAppend);
  }
};
