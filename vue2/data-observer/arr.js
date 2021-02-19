// 改变数组数据那些方法，无法通过object的set,get进行数据侦测，通过自定义拦截器覆盖数组原型
const arrayProto = Array.prototype;
export const arrayMethods = Object.create(arrayProto);
// 定义拦截器
["push", "pop", "shift", "unshift", "splice", "sort", "reverse"].forEach(
  function (method) {
    const original = arrayProto[method];
    Object.defineProperty(arrayMethods, method, {
      configurable: true,
      writable: true,
      enumerable: false,
      value: function mutile(...args) {
        return original.apply(this, args);
      },
    });
  }
);
// 工具函数
export const def = function (target, key, method) {
  Object.defineProperty(target, key, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: method,
  });
};
