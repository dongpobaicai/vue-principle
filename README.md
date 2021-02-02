
# vue-principle

菜鸟的 vue 之路
相关书籍：《深入浅出 vue.js》
[参考网址](https://ustbhuangyi.github.io/vue-analysis/v2/prepare/)

## 前期准备工作

> flow 进行js静态语法校验
> scripts 进行编译打包
  这里选取了 web-full-cjs 编译参数，对应的编译文件 entry-runtime-with-compiler.js
> vue是function导出的类
> 初始化全局api

## 数据驱动

> new Vue 到底发生了什么
> mount
> render 通过createElement返回虚拟DOM
> virtual DOM  定义了一个vnode类，减少操作DOM性能开销
> createElement children规范化 VNode的创建
> _update  首次渲染，数据更新，通过__patch__函数进行渲染成真是DOM，这里涉及一个多平台问题。
> vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)  
> vm.$el 渲染父节点  vnode 需要渲染的虚拟dom  hydrating 表示是否是服务端渲染；removeOnly 是给 transition-group 用的
> 服务器环境，vnode不需要转化。浏览器环境，createElm调用的是DOM原生方法

## 组件化

在vue最开始代码

```js
import Vue from 'vue'
import App from './App.vue'

var app = new Vue({
  el: '#app',
  // 这里的 h 是 createElement 方法
  render: h => h(App)
})
```

createElement里面是对传入的参数进行分析，如果是字符串直接实例化一个普通VNode节点
否则通过createComponent
createComponent组件渲染分为三个部分:

+ 构造子函数
+ 安装组件钩子函数
+ 实例化vnode

### 构造子函数

```js
const baseCtor = context.$options._base

// plain options object: turn it into a constructor
if (isObject(Ctor)) {
  Ctor = baseCtor.extend(Ctor)
}
```

## 项目示例 data-observer

> 一个简单数据侦测实例
> 订阅发布模式
> vue2.0 数据绑定原理
