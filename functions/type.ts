export enum VMTypes {
    Tencent = 'tencent'
}

export function getVmType(vmTypeName: string): VMTypes | null {
    const entries = Object.entries(VMTypes).filter(([_, value]) => value === vmTypeName)
    if (entries.length === 0) {
        return null // 或者抛出一个错误
    }
    return entries[0][1] as VMTypes
}
