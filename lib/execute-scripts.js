const evalScript = require('./eval-script');

const validTypes = [
  // Valid classic types
  'application/ecmascript',
  'application/javascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
  // Valid module type
  'module'
];

const valid = ({type}) => !type || validTypes.includes(type);

const evalGroup = group => group.reduce((lastEval, script) => {
  return lastEval.finally(() => evalScript(script));
}, Promise.resolve());

// Finds and executes scripts in order (used for newly added elements)
// Needed since innerHTML does not run scripts
module.exports = function(el) {
  if (el.tagName.toLowerCase() === 'script') {
    return evalScript(el);
  }

  const scripts = [...el.getElementsByTagName('script')].filter(valid);

  // Group by external scripts
  const groups = scripts.reduce((groups, script) => {
    if (script.src) {
      groups.push([script]);
    } else {
      groups[groups.length - 1].push(script);
    }
    return groups;
  }, [[]]);

  return Promise.all(groups.map(evalGroup));
};
