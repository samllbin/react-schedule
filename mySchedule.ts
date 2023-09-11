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

const priorityList: Priority[] = [
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
];

const workList: Work[] = [];
let prevPriority: Priority = IdlePriority; //正在执行的work的优先级，默认为最低优先级
let curCallback: Callback | null;

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

function perform(work: Work, didTimeout?: boolean): any {}
