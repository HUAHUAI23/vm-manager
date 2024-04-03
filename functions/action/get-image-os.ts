
const imgeList = {
    ubuntu: [
        {
            id: 'img-487zeit5', os: 'ubuntu', version: '22.04-LTS', architect: 'x86_64', img: ''
        }

    ],
    centos: [
        {
            id: 'img-l8og963d', os: 'centos', version: '7.9', architect: 'x86_64'
        }
    ],
    debian: [
        {
            id: 'img-o6psa5bt', os: 'debian', version: '12.4', architect: 'x86_64'
        }
    ],
}

interface body {
    cloudProvider: string
}

export default async function (ctx: FunctionContext) {

    return { data: imgeList, error: null }
}
