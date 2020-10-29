# vue-principle

菜鸟的 vue 之路
相关书籍：《深入浅出 vue.js》
参考网址：https://ustbhuangyi.github.io/vue-analysis/v2/prepare/

### 前期准备工作

> flow 进行js静态语法校验
> scripts 进行编译打包
  这里选取了 web-full-cjs 编译参数，对应的编译文件 entry-runtime-with-compiler.js
> vue是function导出的类
> 初始化全局api

#### 数据驱动
> new Vue 到底发生了什么
> mount
> _render _update
> render 通过createElement返回虚拟DOM
> virtual DOM  定义了一个vnode类，减少操作DOM性能开销
> createElement children规范化 VNode的创建
> _update



### data-observer

> 一个简单数据侦测实例
> 订阅发布模式
> vue2.0 数据绑定原理
