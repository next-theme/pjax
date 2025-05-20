export default (() => {
  let counter = 0;
  return () => {
    const id = `pjax${new Date().getTime()}_${counter}`;
    counter++;
    return id;
  };
})();
