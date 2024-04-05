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
