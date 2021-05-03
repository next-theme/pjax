const tape = require('tape');

const Script = require('../../lib/Script');

tape('test Script with invalid script element', function(t) {
  document.body.className = '';

  let allPassed = true;
  {
    const emptyScriptEle = document.createElement('script');

    if (new Script(emptyScriptEle).evaluable) {
      allPassed = false;
      t.fail('Scripts without both src attribute and content considered evaluable');
    }
  }

  {
    const spaceTypeEle = document.createElement('script');
    spaceTypeEle.setAttribute('type', '   ');
    spaceTypeEle.text = 'somethingMakeItNotEmpty()';

    if (new Script(spaceTypeEle).evaluable) {
      allPassed = false;
      t.fail('Scripts with space filled type attribute considered evaluable');
    }
  }

  {
    const noModuleScriptEle = document.createElement('script');
    noModuleScriptEle.noModule = true;
    noModuleScriptEle.text = 'somethingMakeItNotEmpty()';

    if (new Script(noModuleScriptEle).evaluable) {
      allPassed = false;
      t.fail('Scripts with nomodule attribute considered evaluable');
    }
  }

  {
    const srcInvalidScriptEle = document.createElement('script');
    srcInvalidScriptEle.text = 'somethingMakeItNotEmpty()';

    ['', 'https://'].forEach(invalidValue => {
      srcInvalidScriptEle.setAttribute('src', invalidValue);

      if (new Script(srcInvalidScriptEle).evaluable) {
        allPassed = false;
        t.fail(`Scripts with invalid src attribute '${invalidValue}' considered evaluable`);
      }
    });
  }

  if (allPassed) {
    t.pass('All invalid test cases passed.');
  }

  t.end();
});

tape('test Script.eval method', function(t) {
  document.body.className = '';

  const scriptEle = document.createElement('script');
  scriptEle.text = 'document.body.className = \'executed\'';

  t.equal(document.body.className, '', 'script hasn\'t been executed yet');

  new Script(scriptEle).eval()
    .then(() => {
      t.equal(
        document.body.className,
        'executed',
        'script has been properly executed'
      );
      t.end();
    });
});

tape(
  'evalScript should not throw an error if the script removed itself',
  function(t) {
    const scriptEle = document.createElement('script');
    scriptEle.id = 'myScript';
    scriptEle.text = `
      const script = document.querySelector('#myScript');
      script.parentNode.removeChild(script);
    `;

    new Script(scriptEle).eval()
      .then(() => {
        t.pass('Missing script tested successfully');
      })
      .catch(() => {
        t.fail('Attempted and errored to remove missing script');
      })
      .finally(() => {
        t.end();
      });
  }
);
