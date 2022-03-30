import {RawRoamBlock, RawRoamPage, RoamNode} from "../raw-types"
import {Navigation} from "./common/navigation"
import {getBlockUidsReferencingPage} from "../queries"

import * as _ from "lodash"

export const Roam = {
    query(query: string, ...params: any[]): any[] {
        return window.roamAlphaAPI.q(query, ...params)
    },
    pull(id: number | string, selector = "[*]"): RawRoamPage | RawRoamBlock | null {
        if (!id) {
            console.log("bad id")
            return null
        }
        //@ts-ignore TODO reconcile types
        return window.roamAlphaAPI.pull(selector, id)
    },
    queryFirst(query: string, ...params: any[]) {
        const results = this.query(query, ...params)
        if (!results?.[0] || results?.[0].length < 1) return null

        return this.pull(results[0][0])
    },

    listPageIds() {
        return this.query("[:find ?page :where [?page :node/title ?title] [?page :block/uid ?uid]]").flat()
    },

    listPages(): RawRoamPage[] {
        return this.listPageIds().map((dbId: number) => this.pull(dbId)!)
    },

    getUid(node: RoamNode) {
        return this.pull(node[":db/id"])?.[":block/uid"]
    },
}

function createAttributeString(name: string, value: string) {
    return `${name}::${value}`
}

export abstract class RoamEntity {
    constructor(readonly rawEntity: RawRoamBlock | RawRoamPage) {
        return new Proxy(this, {
            get(origin, property: keyof RoamEntity | string) {
                return origin.child(property)
            },
        })
    }

    abstract get text(): string
    abstract set text(value: string)

    get rawChildren(): RawRoamBlock[] {
        const children = this.rawEntity[":block/children"]?.map(it => Roam.pull(it[":db/id"])) as RawRoamBlock[]
        /**
         * Sorted because the order of the children returned is ~arbitrary
         */
        return children?.sort((a, b) => a[":block/order"]! - b[":block/order"]!) || []
    }

    get children(): Block[] {
        return this.rawChildren.map(it => new Block(it))
    }

    get uid(): string {
        return this.rawEntity[":block/uid"]
    }

    get url(): string {
        return Navigation.urlForUid(this.uid)
    }

    /**
     * The desired effect is to be able to get child blocks either by content or by order
     * block[number] would give you children by order (block[0] is a first child)
     * block.content or block["content"] would give you a child by content
     *
     * Todo potentially allow accessing the roam attributes without having to specify `::` at the end
     * Todo can i support regex selectors? - maybe. would require custom parsing though, everythign I get is a string =\
     */
    child(property: keyof RoamEntity | string) {
        const idx = parseInt(property)
        if (Number.isInteger(idx)) return this.children?.[idx]

        if (property in this) {
            return this[property as keyof RoamEntity]
        } else {
            //todo check for regex stuff explicitly
            return this.childWithValue(property) ||
                this.childrenMatching(new RegExp(`^${property}::`))?.[0] ||
                this.childrenMatching(new RegExp(property))
        }
    }

    childWithValue(content: string) {
        return this.children?.find(it => it.text === content)
    }

    childAtPath(path: string[]) {
        return path.reduce(
            (block: RoamEntity | undefined, pathElement: string) =>
                block?.child(pathElement) as (RoamEntity | undefined), this)
    }

    childrenMatching(regex: RegExp) {
        const result = this.children?.filter(it => regex.test(it.text))
        return result?.length ? result : null
    }

    get linkedEntities(): (RawRoamPage | RawRoamBlock | null)[] | undefined {
        // todo this has a mix of entities, it's not clear what this should return 🤔
        // either figure out if it's a page or block and create & return a mixed array
        // or have to 2 separate methods - one for block and one for pages
        return this.rawEntity[":block/refs"]?.map(it => Roam.pull(it[":db/id"]))
    }

    setAttribute(name: string, value: string) {
        const existing = this.child(name) as Block
        if (existing) {
            existing.setAsAttribute(name, value)
            return
        }

        this.appendChild(createAttributeString(name, value))
    }

    setAsAttribute(name: string, value: string) {
        this.text = createAttributeString(name, value)
    }

    appendChild(text: string) {
        //todo return new uid?
        window.roamAlphaAPI.createBlock({
           location: {
               "parent-uid": this.uid,
               //todo is this append?
               order: -1,
           },
           block: {
               string: text
           }
        })
    }
}

export class Page extends RoamEntity {
    constructor(rawPage: RawRoamPage) {
        super(rawPage)
    }

    get rawPage(): RawRoamPage {
        return this.rawEntity as RawRoamPage
    }

    static fromName(name: string) {
        const rawPage = Roam.queryFirst("[:find ?e :in $ ?a :where [?e :node/title ?a]]", name)
        return rawPage ? new this(rawPage) : null
    }

    get text(): string {
        return this.rawPage[":node/title"]
    }

    set text(value: string) {
        window.roamAlphaAPI.updatePage({
            page: {
                uid: this.uid,
                title: value,
            },
        })
    }
}

export class Attribute extends Page {
    getUniqueValues(): Set<string> {
        return new Set(this.getAllValues())
    }

    getAllValues(): string[] {
        return getBlockUidsReferencingPage(this.text)
            .map(Block.fromUid)
            .flatMap(it => it?.listAttributeValues() || [])
    }

    getValuesByCount() {
        const allValues = this.getAllValues()
        return Object.entries(_.countBy(allValues))
            .sort(([, a], [, b]) => (a as number) - (b as number)).reverse()
    }

    findBlocksWithValue(value: string): Block[] {
        //todo compare perf of querying for "contains 2 pages"
        const attributeBlocks = getBlockUidsReferencingPage(this.text)
        const valuePageBlocks = new Set(getBlockUidsReferencingPage(value))
        let intersect = new Set(attributeBlocks.filter(i => valuePageBlocks.has(i)))

        //todo not exactly correct
        return [...intersect].map(Block.fromUid)
        // return getBlockUidsReferencingPage("isa")
        //     .map(Block.fromUid)
        //     .filter(it => it?.listAttributeValues().includes(value))

    }


}


export class Block extends RoamEntity {
    constructor(rawBlock: RawRoamBlock) {
        super(rawBlock)
    }

    get rawBlock(): RawRoamBlock {
        return this.rawEntity as RawRoamBlock
    }

    static fromUid(uid: string) {
        //todo support things wrapped in parens
        const rawBlock = Roam.queryFirst('[:find ?e :in $ ?a :where [?e :block/uid ?a]]', uid)
        return rawBlock ? new Block(rawBlock as RawRoamBlock) : undefined
    }

    get text(): string {
        return this.rawBlock[":block/string"]
    }

    set text(value: string) {
        window.roamAlphaAPI.updateBlock({
            block: {
                uid: this.uid,
                string: value,
            },
        })
    }

    get containerPage(): Page {
        return new Page(Roam.pull(this.rawBlock[":block/page"][":db/id"])!)
    }

    /**
     * Attribute value is weird - can be any of the children or the same-line value
     */
    get attributeValue(): string | undefined {
        return this.text.split("::")[1]?.trim()
    }

    get definesAttribute(): boolean {
        return this.text.includes("::")
    }

    listAttributeValues(splitRegex?: RegExp): string[] {
        if (!this.definesAttribute) return []

        // todo do we just want text values?
        const childrenValues = this.children.map(it => it.text)


        // todo doing this vs default value, because this breaks safari
        // which does not support lookbehind =\ (roam-date bug)
        const defaultRegex = new RegExp('(?<=])\\s?(?=\\[)', 'g')
        const inPlaceValues = this.listInPlaceAttributeValues(splitRegex ? splitRegex : defaultRegex)

        return [...inPlaceValues, ...childrenValues]
    }

    listInPlaceAttributeValues(splitRegex: RegExp) {
        const valueStr = this.text.split("::")[1]?.trim()
        return valueStr?.split(splitRegex)?.filter(it => it) || []
    }
}
