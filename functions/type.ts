export enum VmVendors {
    Tencent = 'tencent'
}

export enum StoppedMode {
    KEEP_CHARGING = 'KEEP_CHARGING',
    STOP_CHARGING = 'STOP_CHARGING'
}



export function getVmVendor(vmTypeName: string): VmVendors | null {
    const entries = Object.entries(VmVendors).filter(([_, value]) => value === vmTypeName)
    if (entries.length === 0) {
        return null // 或者抛出一个错误
    }
    return entries[0][1] as VmVendors
}

/**
 * 检查值是否存在于枚举中。
 * 
 * @param enumObj 枚举对象
 * @param value 要检查的值
 * @returns 如果值存在于枚举中，返回该值；否则抛出错误
 * @throws 如果未找到匹配项，将抛出错误
 */
export function isValueInEnum<T extends Record<string, any>>(enumObj: T, value: any): T[keyof T] {
    const values = Object.values(enumObj)
    if (values.includes(value)) {
        return value as T[keyof T]
    }
    throw new Error(`Invalid value: '${value}' does not exist in the given enum.`)
}

