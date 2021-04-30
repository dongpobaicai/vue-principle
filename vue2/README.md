# vue-principle

菜鸟的 vue 之路
相关书籍：《深入浅出 vue.js》
[参考资料，特别推荐](https://vue-js.com/learn-vue/)
[参考资料](https://ustbhuangyi.github.io/vue-analysis/v2/prepare/)

## 项目示例 data-observer

- 一个简单数据侦测实例
- 订阅发布模式
- vue2.0 数据绑定原理

## 源码基本结构

- dist 打包编译后文件
- examples 例子
- flow 类型声明文件
- packages 跨平台相关的包
- scripts 运行脚本
- test 测试用例
- types ts 类型声明文件
- src 核心代码
  - compiler 编译相关
  - core 核心代码
    - components 组件相关
    - global-api 全局 api
    - instance 实例相关和原型方法
    - observer 数据侦测
    - util 工具相关
    - vdom 虚拟 dom 相关
  - platforms 特定平台运行的代码
  - server 服务端渲染相关
  - sfc 单文件组件的解析代码
  - shared 全局常量和工具类

## 预期目标

1. 数据侦测
   1.1 UI = render(state) UI 为用户界面 state 为内容状态 通过 render 将改变状态转化为页面。
   vue 就是承担这一部分工作，那么 state 改变，vue 如何知道，就需要数据侦测

   ```js
   // 源码位置：src/core/observer/index.js

   var obj = {
     price: "",
   };
   var val = 3000;
   Object.defineProperty(obj, "price", {
     set: function (newVal) {
       val = newVal;
     },
     get: function () {
       console.log("price属性被读取");
       return val;
     },
   });
   ```

   知道了数据变化，如果知道哪些视图需要，所以需要一个依赖数组。
   何时收集依赖，何时数据更新通知依赖？ get 收集依赖，set 通知依赖更新

   1.2 依赖管理类 dep

   ```js
   // 源码位置：src/core/observer/dep.js

   export default class Dep {
     constructor() {
       this.subs = [];
     }

     addSub(sub) {
       this.subs.push(sub);
     }
     // 删除一个依赖
     removeSub(sub) {
       remove(this.subs, sub);
     }
     // 添加一个依赖
     depend() {
       if (window.target) {
         this.addSub(window.target);
       }
     }
     // 通知所有依赖更新
     notify() {
       const subs = this.subs.slice();
       for (let i = 0, l = subs.length; i < l; i++) {
         subs[i].update();
       }
     }
   }
   ```

   1.3 依赖类 watcher

   1.4 数组数据侦测
   1.4.1 数组的收集位置继续在 getter
   1.4.2 数组的触发，由于数组没有 setter 方法，通过拦截改变数据那几个方法，达到监听目的

   ```js
   var originPush = Array.prototype.push;
   Array.prototype.push = function (val) {
     console.log("执行数据push方法");
     this.originPush(val);
   };
   ```

2. 虚拟 dom

- 定义：是一个 js 对象，用来描述真实的 dom 结构
- 虚拟 dom 的结构：树形结构 树结构的，每一层的结构是一样的
  - tag
  - attrs
  - children
- 为什么需要虚拟 DOM
  - 对于复杂的页面，如果更新某一部分，需要递归比较 dom 子树，比较 js 对象，性能优于直接比较 DOM，真实 DOM 上很多属性，存储起来消耗大量内存。虚拟 DOM 可以只保留需要属性字段
  - 常见 DOM 操作，大致分为三类，新增，更新，删除 操作 js 更方便，而且还可以做优化，建立一个更新栈，当栈满了，进行批量更新
- vue 中的虚拟 DOM，结构如下

```js
// 源码位置：src/core/vdom/vnode.js
{
  this.tag = tag; /*当前节点的标签名*/
  this.data = data; /*当前节点对应的对象，包含了具体的一些数据信息，是一个VNodeData类型，可以参考VNodeData类型中的数据信息*/
  this.children = children; /*当前节点的子节点，是一个数组*/
  this.text = text; /*当前节点的文本*/
  this.elm = elm; /*当前虚拟节点对应的真实dom节点*/
  this.ns = undefined; /*当前节点的名字空间*/
  this.context = context; /*当前组件节点对应的Vue实例*/
  this.fnContext = undefined; /*函数式组件对应的Vue实例*/
  this.fnOptions = undefined;
  this.fnScopeId = undefined;
  this.key = data && data.key; /*节点的key属性，被当作节点的标志，用以优化*/
  this.componentOptions = componentOptions; /*组件的option选项*/
  this.componentInstance = undefined; /*当前节点对应的组件的实例*/
  this.parent = undefined; /*当前节点的父节点*/
  this.raw = false; /*简而言之就是是否为原生HTML或只是普通文本，innerHTML的时候为true，textContent的时候为false*/
  this.isStatic = false; /*静态节点标志*/
  this.isRootInsert = true; /*是否作为跟节点插入*/
  this.isComment = false; /*是否为注释节点*/
  this.isCloned = false; /*是否为克隆节点*/
  this.isOnce = false; /*是否有v-once指令*/
  this.asyncFactory = asyncFactory;
  this.asyncMeta = undefined;
  this.isAsyncPlaceholder = false;
}
```

- VNode 的类型
- 注释节点 text isComment

```js
export const createEmptyVNode = (text: string = "") => {
  const node = new VNode();
  node.text = text;
  node.isComment = true;
  return node;
};
```

- 文本节点 text

```js
export function createTextVNode(val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val));
}
```

- 克隆节点 isCloned

```js
export function cloneVNode(vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children,
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  );
  cloned.ns = vnode.ns;
  cloned.isStatic = vnode.isStatic;
  cloned.key = vnode.key;
  cloned.isComment = vnode.isComment;
  cloned.fnContext = vnode.fnContext;
  cloned.fnOptions = vnode.fnOptions;
  cloned.fnScopeId = vnode.fnScopeId;
  cloned.asyncMeta = vnode.asyncMeta;
  cloned.isCloned = true;
  return cloned;
}
```

- 元素节点 tag data children

```js
// 真实DOM节点
<div id='a'><span>难凉热血</span></div>

// VNode节点
{
  tag:'div',
  data:{ id: 'a' },
  children:[
    {
      tag:'span',
      text:'难凉热血'
    }
  ]
}
```

- 组件节点
  - componentOptions :组件的 option 选项，如组件的 props 等
  - componentInstance :当前组件节点对应的 Vue 实例
- 函数式组件节点
  - fnContext:函数式组件对应的 Vue 实例
  - fnOptions: 组件的 option 选项
- VNode Diff 算法

  - patch 过程 以新的 VNode 为准，更新旧的 VNode，也就是当前试图对应的
  - 如果新文档上存在，旧文档不存在，补全旧文档

    - 创建结点 需要插入到真实 DOM，只有三种节点

    ```js
    // 源码位置: /src/core/vdom/patch.js
    // 元素节点，文本节点，注释节点
    function createElm(vnode, parentElm, refElm) {
      const data = vnode.data;
      const children = vnode.children;
      const tag = vnode.tag;
      if (isDef(tag)) {
        vnode.elm = nodeOps.createElement(tag, vnode); // 创建元素节点
        createChildren(vnode, children, insertedVnodeQueue); // 创建元素节点的子节点
        insert(parentElm, vnode.elm, refElm); // 插入到DOM中
      } else if (isTrue(vnode.isComment)) {
        vnode.elm = nodeOps.createComment(vnode.text); // 创建注释节点
        insert(parentElm, vnode.elm, refElm); // 插入到DOM中
      } else {
        vnode.elm = nodeOps.createTextNode(vnode.text); // 创建文本节点
        insert(parentElm, vnode.elm, refElm); // 插入到DOM中
      }
    }
    // nodeOps 为了兼容跨平台，创建的VNode操作类
    ```

  - 如果新文档不存在，旧文档存在，删除旧文档上面的

  ```js
  // 删除节点  直接调用父元素的removeChild方法
  function removeNode(el) {
    const parent = nodeOps.parentNode(el); // 获取父节点
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el); // 调用父节点的removeChild方法
    }
  }
  ```

  - 如果新旧文档都存在，则对比更新旧文档

  ```js
  // 更新过程，又分三种情况
  // 1、都是静态节点
  // 2、新节点为文本节点
  // 3、元素节点 有无子节点
  // 更新节点
  function patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly) {
    // vnode与oldVnode是否完全一样？若是，退出程序
    if (oldVnode === vnode) {
      return;
    }
    const elm = (vnode.elm = oldVnode.elm);

    // vnode与oldVnode是否都是静态节点？若是，退出程序
    if (
      isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      return;
    }

    const oldCh = oldVnode.children;
    const ch = vnode.children;
    // vnode有text属性？若没有：
    if (isUndef(vnode.text)) {
      // vnode的子节点与oldVnode的子节点是否都存在？
      if (isDef(oldCh) && isDef(ch)) {
        // 若都存在，判断子节点是否相同，不同则更新子节点
        if (oldCh !== ch)
          updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly);
      }
      // 若只有vnode的子节点存在
      else if (isDef(ch)) {
        /**
         * 判断oldVnode是否有文本？
         * 若没有，则把vnode的子节点添加到真实DOM中
         * 若有，则清空Dom中的文本，再把vnode的子节点添加到真实DOM中
         */
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, "");
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
      }
      // 若只有oldnode的子节点存在
      else if (isDef(oldCh)) {
        // 清空DOM中的子节点
        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
      }
      // 若vnode和oldnode都没有子节点，但是oldnode中有文本
      else if (isDef(oldVnode.text)) {
        // 清空oldnode文本
        nodeOps.setTextContent(elm, "");
      }
      // 上面两个判断一句话概括就是，如果vnode中既没有text，也没有子节点，那么对应的oldnode中有什么就清空什么
    }
    // 若有，vnode的text属性与oldVnode的text属性是否相同？
    else if (oldVnode.text !== vnode.text) {
      // 若不相同：则用vnode的text替换真实DOM的文本
      nodeOps.setTextContent(elm, vnode.text);
    }
  }
  ```

3. 模板编译篇
4. 实例方法篇
5. 全局 api 篇
6. 生命周期篇
7. 指令篇
8. 过滤器篇
9. 内置组件篇
