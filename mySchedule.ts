import {
  unstable_IdlePriority as IdlePriority,
  unstable_ImmediatePriority as ImmediatePriority,
  unstable_LowPriority as LowPriority,
  unstable_NormalPriority as NormalPriority,
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_getFirstCallbackNode as getFirstCallbackNode,
  unstable_shouldYield as shouldYield,
  unstable_scheduleCallback as scheduleCallback,
  unstable_cancelCallback as cancelCallback,
  Callback,
} from "./scheduler";

type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

type Task = {
  id: number;
  callback: Callback | null;
  priorityLevel: PriorityLevel;
  startTime: number;
  expirationTime: number;
  sortIndex: number;
  isQueued?: boolean;
};

type Priority =
  | typeof IdlePriority
  | typeof ImmediatePriority
  | typeof LowPriority
  | typeof NormalPriority
  | typeof UserBlockingPriority;

interface Work {
  priority: Priority;
  count: number;
}

const workList: Work[] = [];
let prevPriority: Priority = IdlePriority; //正在执行的work的优先级，默认为最低优先级
let curCallback: null | Task;

function schedule() {
  //取出当前可能正在执行的回调
  const cbNode = getFirstCallbackNode();
  //取出优先级最高的work
  const curWork = workList.sort((w1, w2) => {
    return w1.priority - w2.priority;
  })[0];

  //不存在curwork需要执行
  if (!curWork) {
    curCallback = null;
    //这里因为没有curWork说明当前正在执行的work也被删除掉了，因为work自动删除的时机是在work执行完成之后
    cbNode && cancelCallback(cbNode);
    return;
  }

  const { priority: curPriority } = curWork;

  if (curPriority === prevPriority) {
    //同上，在该work未被删除之前，且在执行中，只可能存在与其优先级相等的或高于其优先级的work
    //如果优先级相等，直接退出调度
    return;
  }

  //剩下的就是优先级比当前正在执行的work高的
  //在执行更高优先级work前需要先将当前work进行中断
  cbNode && cancelCallback(cbNode);

  //调度当前优先级最高的work
  curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

function perform(work: Work, didTimeout?: boolean): any {
  //是否需要同步执行
  //满足work是同步优先级，当前调度的任务已经过期需要同步执行
  const needSync = work.priority === ImmediatePriority || didTimeout;
  while ((needSync || !shouldYield()) && work.count) {
    //当scheduler预留的5ms时间不够时，shouldYield就会变成true，导致循环中断
    work.count--;
    //执行需要的工作
  }

  prevPriority = work.priority;

  if (!work.count) {
    //从workList中删除已经执行完的work
    const WorkIndex = workList.indexOf(work);
    workList.splice(WorkIndex, 1);

    //重置优先级
    prevPriority = IdlePriority;
  }

  const prevCallback = curCallback;
  schedule();
  const newCallback = curCallback;

  //调度完成后，如果callback发生变化代表是新work，如果不是则是同一个work
  if (newCallback && prevCallback === newCallback) {
    //同一个work，被时间切片
    //返回的函数会被scheduler继续调用
    return perform.bind(null, work);
  }
}
