import set from "lodash.set"


export const utils = {
  isNamespace: o => o && !o.type,
  flattenSchema(obj: any, prefix?) {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      if (utils.isNamespace(val)) {
        acc = { ...acc, ...utils.flattenSchema(val, key) }
      } else {
        const path = prefix ? `${prefix}.${key}` : key
        //@ts-ignore
        val.path = path
        //@ts-ignore
        acc[path] = val
      }
      return acc
    }, {})
  },
  wrapSchema(object) {
    return Object.values(object).reduce((acc, i) => {
      //@ts-ignore
      set(acc, i.path, i)
      return acc
    }, {})
  }
}

// console.log(utils.flattenSchema({
//   sum: {
//     type: "func",
//   },
//   var: {
//     type: "var",
//     value: 1
//   },
//   obj: {
//     a: { type: "var" },
//     b: { type: "func" }
//   }
// }))
// console.log(utils.wrapSchema({
//   sum: {
//     type: "func",
//     path: "sum",
//   },
//   var: {
//     type: "var",
//     value: 1,
//     path: "var",
//   },
//   "obj.a": {
//     type: "var",
//     path: "obj.a",
//   },
//   "obj.b": {
//     type: "func",
//     path: "obj.b",
//   },
// }))