export default function contains(doc, selectors, el) {
  for (let i = 0; i < selectors.length; i++) {
    const selectedEls = doc.querySelectorAll(selectors[i]);
    for (let j = 0; j < selectedEls.length; j++) {
      if (selectedEls[j].contains(el)) {
        return true;
      }
    }
  }

  return false;
}
