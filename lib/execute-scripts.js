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
module.exports = function(scripts) {
  const validScripts = [...scripts].filter(valid);

  // Group by external scripts
  const groups = validScripts.reduce((groups, script) => {
    const externalBlocking
      = script.src && !script.async && !script.defer
      && script.type.toLowerCase() !== 'module';

    const lastGroup = groups[groups.length - 1];
    if (externalBlocking && lastGroup.length > 0) {
      groups.push([script]);
    } else {
      lastGroup.push(script);
    }
    return groups;
  }, [[]]);

  return Promise.all(groups.map(evalGroup));
};
