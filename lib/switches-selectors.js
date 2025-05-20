import forEachEls from "./foreach-els";
import defaultSwitches from "./switches";

export default function(
  switches,
  switchesOptions,
  selectors,
  fromEl,
  toEl,
  options
) {
  const switchesQueue = [];

  selectors.forEach(function(selector) {
    const newEls = fromEl.querySelectorAll(selector);
    const oldEls = toEl.querySelectorAll(selector);
    if (this.log) {
      this.log("Pjax switch", selector, newEls, oldEls);
    }
    if (newEls.length !== oldEls.length) {
      throw `DOM doesn’t look the same on new loaded page: ’${selector}’ - new ${newEls.length}, old ${oldEls.length}`;
    }

    forEachEls(
      newEls,
      function(newEl, i) {
        const oldEl = oldEls[i];
        if (this.log) {
          this.log("newEl", newEl, "oldEl", oldEl);
        }

        const callback = switches[selector]
          ? switches[selector].bind(
              this,
              oldEl,
              newEl,
              options,
              switchesOptions[selector]
            )
          : defaultSwitches.outerHTML.bind(this, oldEl, newEl, options);

        switchesQueue.push(callback);
      },
      this
    );
  }, this);

  this.state.numPendingSwitches = switchesQueue.length;

  switchesQueue.forEach(queuedSwitch => {
    queuedSwitch();
  });
}
