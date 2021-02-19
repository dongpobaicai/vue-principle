// vue如何知道数据变化，通过数据侦测来完成
// vue2.0  通过Object.defineProperty
//
import { arrayMethods, def, defineArr } from "arr.js";

// 是否可使用__proto__
const hasProto = "__proto__" in {};
const arrayKeys = Object.getOwnPropertyNames(arrayMethods);
class HVue {
  constructor(options) {
    this.options = options;
    this.init();
  }
  // 初始化
  init() {
    // 变的可观测
    new Observer(this.options.data);
  }
  // 注册依赖对象
  setWatcher(path, cb) {
    new Watcher(this.options, path, cb);
  }
}

// 递归
class Observer {
  constructor(obj) {
    this.obj = obj;
    this.dep = new Dep();
    // 针对数组特殊处理
    if (Array.isArray(obj)) {
      // 这里兼容不支持__proto__
      const augment = hasProto ? protoAugment : copyAugment;
      augment(obj, arrayMethods, arrayKeys);
      return;
    } else {
      this.walk();
    }
  }
  walk() {
    let keys = Object.keys(this.obj);
    for (let i = 0; i < keys.length; i++) {
      let currentObj = this.obj[keys[i]];
      if (typeof currentObj == "object") {
        new Observer(currentObj);
        return;
      }
      defineReactive(this.obj, keys[i], currentObj);
    }
    return this.obj;
  }
}
function protoAugment(target, src, keys) {
  target.__proto__ = src;
}
function copyAugment(target, src, keys) {
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    def(target, key, src[key]);
  }
}

// get 收集依赖   set里通知依赖
function defineReactive(data, key, val) {
  let childOb = observe(val); // 修改
  let dep = new Dep();
  Object.defineProperty(data, key, {
    configurable: true,
    enumerable: true,
    get: function () {
      // 添加依赖
      dep.depend();
      if (childOb) {
        childOb.dep.depend();
      }
      return val;
    },
    set: function (newVal) {
      // 触发通知，这里增加判断，缓存
      if (newVal == val) return;
      val = newVal;
      dep.notify(newVal);
    },
  });
}
// 存放依赖的容器
// 一个属性关联多个依赖，需要数组存储
// 假设依赖对象放在 window.target
class Dep {
  constructor() {
    this.subs = [];
  }
  push(target) {
    this.subs.push(target);
  }
  depend() {
    if (window.target) {
      this.push(window.target);
    }
  }
  notify(newVal) {
    // 遍历所有依赖
    for (let i = 0; i < this.subs.length; i++) {
      this.subs[i].update(newVal);
    }
  }
}
// 依赖对象
class Watcher {
  constructor(vm, expOrFn, cb) {
    this.vm = vm;
    this.getter = parsePath(expOrFn);
    this.cb = cb;
    this.value = this.get();
  }
  get() {
    window.target = this;
    let value = this.getter.call(this.vm, this.vm);
    window.target = undefined;
    return value;
  }
  update(newVal) {
    let oldVal = this.value;
    this.value = newVal;
    this.cb.call(this.vm, newVal, oldVal);
  }
}

// 解析路径的方法
function parsePath(path) {
  var bailRE = /[^\w.$]/;
  if (bailRE.test(path)) {
    return;
  }
  var segments = path.split(".");
  return function (obj) {
    for (var i = 0; i < segments.length; i++) {
      if (!obj) return;
      obj = obj[segments[i]];
    }
    return obj;
  };
}
window.HVue = HVue;
