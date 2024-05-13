export enum VmVendors {
    Tencent = 'tencent'
}



export function getVmVendor(vmTypeName: string): VmVendors | null {
    const entries = Object.entries(VmVendors).filter(([_, value]) => value === vmTypeName)
    if (entries.length === 0) {
        return null // 或者抛出一个错误
    }
    return entries[0][1] as VmVendors
}

/**
 * 从字符串中获取枚举值的通用函数。
 * 
 * @param enumObj 枚举对象
 * @param key 枚举的字符串键
 * @returns 对应的枚举值
 * @throws 如果未找到匹配项，将抛出错误
 */
export function getEnumValueFromString<T extends Record<string, any>>(enumObj: T, key: string): T[keyof T] {
    if (key in enumObj) {
        return enumObj[key as keyof T]
    }
    throw new Error(`Invalid key: '${key}' does not exist in the given enum.`)
}