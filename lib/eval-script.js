const evalScript = (el) => new Promise((resolve, reject) => {
  const script = document.createElement('script');

  // Clone attributes
  Object.values(el.attributes).forEach(attr => {
    script.setAttributeNode(attr.cloneNode(true));
  });

  script.text = el.text;

  const external = !!script.src;

  // Reset async of external script to force synchronous loading
  // Needed since it defaults to true on dynamic scripts
  if (external) {
    if (!script.hasAttribute('async')) script.async = false;
  }

  const externalBlocking
    = external && !script.async && !script.defer
    && script.type.toLowerCase() !== 'module';

  if (externalBlocking) {
    script.onload = resolve;
    script.onerror = reject;
  }

  // Execute
  try {
    el.replaceWith(script);
  } catch (e) {
    reject(e);
  }

  if (!externalBlocking) resolve();
});

module.exports = evalScript;
