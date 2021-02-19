# vue-principle

菜鸟的 vue 之路
相关书籍：《深入浅出 vue.js》
[参考网址](https://ustbhuangyi.github.io/vue-analysis/v2/prepare/)

## 前期准备工作

- flow 进行 js 静态语法校验
- scripts 进行编译打包
- 这里选取了 web-full-cjs 编译参数，对应的编译文件 entry-runtime-with-compiler.js
- vue 是 function 导出的类
- 初始化全局 api

## 数据驱动

- new Vue 到底发生了什么
- mount
- render 通过 createElement 返回虚拟 DOM
- virtual DOM 定义了一个 vnode 类，减少操作 DOM 性能开销
- createElement children 规范化 VNode 的创建
- \_update 首次渲染，数据更新，通过**patch**函数进行渲染成真是 DOM，这里涉及一个多平台问题。
- vm.**patch**(vm.$el, vnode, hydrating, false /_ removeOnly _/)
- vm.$el 渲染父节点 vnode 需要渲染的虚拟 dom hydrating 表示是否是服务端渲染；removeOnly 是给 transition-group 用的
- 服务器环境，vnode 不需要转化。浏览器环境，createElm 调用的是 DOM 原生方法

## 组件化

在 vue 最开始代码

```js
import Vue from "vue";
import App from "./App.vue";

var app = new Vue({
  el: "#app",
  // 这里的 h 是 createElement 方法
  render: (h) => h(App),
});
```

> createElement 里面是对传入的参数进行分析，如果是字符串直接实例化一个普通 VNode 节点
> 否则通过 createComponent
> createComponent 组件渲染分为三个部分:

- 构造子函数
- 安装组件钩子函数
- 实例化 vnode

### 构造子函数

```js
const baseCtor = context.$options._base;

// plain options object: turn it into a constructor
if (isObject(Ctor)) {
  Ctor = baseCtor.extend(Ctor);
}
```

## 项目示例 data-observer

- 一个简单数据侦测实例
- 订阅发布模式
- vue2.0 数据绑定原理
