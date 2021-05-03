const tape = require('tape');

const executeScripts = require('../../lib/execute-scripts');

tape(
  'test executeScripts method with non-array iterables',
  function(t) {
    const container = document.createElement('div');
    container.innerHTML = `
      <script>document.body.className = 'executed';</script>
      <script>document.body.className += ' correctly';</script>
    `;

    document.body.className = '';
    t.equal(document.body.className, '', 'NodeList object hasn\'t been tested yet');

    executeScripts(container.querySelectorAll('script'))
      .then(() => {
        t.equal(
          document.body.className,
          'executed correctly',
          'NodeList object has been properly parsed'
        );

        document.body.className = '';
        t.equal(document.body.className, '', 'Set object hasn\'t been tested yet');

        return executeScripts(new Set(container.querySelectorAll('script')));
      })
      .then(() => {
        t.equal(
          document.body.className,
          'executed correctly',
          'Set object has been properly parsed'
        );
      })
      .then(() => {
        t.end();
      });
  }
);
