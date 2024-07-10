import set from "lodash.set"

export const utils = {
  isNamespace: o => o && !o.type,
  flattenSchema(obj: any, prefix?) {
    return Object.entries(obj).reduce((acc, [key, val]) => {
      const path = prefix ? `${prefix}.${key}` : key

      if (utils.isNamespace(val)) {
        acc = { ...acc, ...utils.flattenSchema(val, path) }
      } else {
        //@ts-ignore
        Object.assign(val, {
          name: path,
        })
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
