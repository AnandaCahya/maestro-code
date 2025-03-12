const fs = require("node:fs")
const { dialog } = require("electron")
const path = require("node:path")

module.exports.selectFolder = async (win) => {
    const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0]
    }
    return null
}

module.exports.listFilesReursively = (dir) => {
    let result = []
    const files = fs.readdirSync(dir)
    for (const file of files) {
        const filePath = path.join(dir, file)
        try {
            const stat = fs.statSync(filePath)
            const value = stat.isDirectory() ? fs.readdirSync(filePath, "utf-8") : null

            if (stat.isDirectory()) {
                result.push({ name: file, path: filePath, type: 'folder', children: this.listFilesReursively(filePath) })
            } else {
                result.push({ name: file, path: filePath, type: 'file' })
            }
        } catch (err) {
            return
        }
    }

    return result
}

module.exports.valueFile = (filePath) => {
    let value = fs.readFileSync(filePath, "utf-8")
    if(!value) return;
    return { oldValue: value, value: value, path: filePath}
};
