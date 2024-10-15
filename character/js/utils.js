// module utils
function options(obj) {
    return Object.keys(obj).map(key => ({
      key: key,
      name: obj[key].name
    }));
}
export { options };