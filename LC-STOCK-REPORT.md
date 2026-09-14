# LC Stock Report — which items are being counted, and which are not

_Generated 2026-09-08 from the live database, updated 2026-09-09 with photos and barcode status.
Covers the **LC** area only._

_Every item table below now starts with a photo, and its SKU is followed by its barcode
(article number). **3 items have no barcode on file** and are marked **⚠️ No barcode** in that
column instead._

## The short version

- **116 items** are currently sitting in LC and available (not sold).
- **65 of them are counted** by a stock rule.
- **51 of them are not counted** — they are physically there, but no stock rule picks them up.
- **3 items have no barcode** on file at all (all three are in the uncounted Dining Tables list):
  LC10 T4-100426, LC9 T9 24.06, LC9 T5 17.06.

An item is counted when it satisfies **every** condition of a stock rule: it has to be the right
category, it has to be in LC, and it has to carry every property the rule asks for. If a single
property is missing from the item, the rule cannot claim it.

> **The numbers in the app are correct.** Every stock rule's count was recalculated from scratch
> and matched the app exactly. The uncounted items below are not a counting error — they are
> items whose product information is incomplete, or categories nobody has set up a rule for yet.

_Sold items are never counted, by design; 130 sold items are also sitting in LC and are excluded from this report._

## Why the uncounted items are uncounted

| Items affected | Reason |
|---:|---|
| 26 | Missing property: **Upholstery** |
| 12 | **Set size** does not match what any rule tracks |
| 8 | Missing property: **Shape** |
| 5 | Missing property: **Wood type** (so no wood group applies) |
| 4 | No stock rule exists for the category (Bar Cabinets) |
| 4 | **Weight** does not match what any rule tracks |
| 1 | No stock rule exists for the category (unknown) |
| 1 | No stock rule exists for the category (Seating Benches) |
| 1 | No stock rule exists for the category (Serving Trolleys) |

The single biggest cause is **Upholstery**. Every one of the Dining Chairs rules asks for it, but
most chair listings in LC do not have that field filled in, so those chairs fall outside all of them.

---

## Items being counted

### Armchairs — 3 items (6 units)

**Rule — Wood group: Dark** · counts 4 units across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08891.jpg?v=1774444170" alt="Ch9-250326" width="60"> | LC1 | Ch9-250326 | 260129164526 | Danish dining armchairs in walnut 'model 213' by Thomas Harl | Walnut | 4 |

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC06232_f69174af-3add-4c5e-84b3-7af45e7de20e.jpg?v=1786016773" alt="ACh1-060826" width="60"> | LC12 | ACh1-060826 | 0000913 | Swedish armchair in beech | Beech | 1 |

**Rule — Wood group: Teak** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01672_230eca55-8fe4-409b-ae70-3dcfffffc4e0.jpg?v=1784028748" alt="ACh2-140726" width="60"> | LC12 | ACh2-140726 | 85956372 | Swedish armchair in teak | Teak | 1 |

### Bookshelves — 2 items (2 units)

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09461.jpg?v=1774953379" alt="BSh1-310326" width="60"> | LC0 | BSh1-310326 | 260220114829 | Swedish bookshelf in oak | Oak | 1 |

**Rule — Wood group: Teak** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00812_975e9df3-b79e-40e9-b8a7-e01ea1730e69.jpg?v=1788511405" alt="BSh1-040926" width="60"> | LC0 | BSh1-040926 | 0001487 | Swedish bookshelf in teak | Teak | 1 |

### Coffee Tables — 9 items (9 units)

**Rule — Wood group: Dark** · counts 2 units across 2 items · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08088.jpg?v=1780052572" alt="Ct11-290526" width="60"> | LC6 | Ct11-290526 | 04 2 001 0034 | Danish coffee table in santos rosewood | Santos Rosewood | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC04635_b71877a6-c3f9-4e46-b211-4bd64eb6b1af.jpg?v=1785239476" alt="Ct4-280726" width="60"> | LC7 | Ct4-280726 | 0000872 | Danish coffee table in Santos rosewood | Santos Rosewood | 1 |

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC06462.jpg?v=1773242658" alt="Ct2-110326" width="60"> | LC0 | Ct2-110326 | 260306125135 | Swedish coffee table in beech by David Rosén for Nordiska Ko | Elm, Beech | 1 |

**Rule — Wood group: Teak** · counts 6 units across 6 items · status: extra in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09655_a078bb34-47ff-4aac-a896-d916ae1cf3ca.jpg?v=1783081383" alt="St1-030726" width="60"> | LC4 | St1-030726 | 0520010024 | Swedish coffee table in teak and oak | Teak, Oak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08049.jpg?v=1780052374" alt="Ct7-290526" width="60"> | LC5 | Ct7-290526 | 04 2 001 0048 | Danish coffee table in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01060_94887045-a840-480d-b8f1-01ccdd3d1e3f.jpg?v=1783598842" alt="CT1-090726" width="60"> | LC5 | CT1-090726 | 0000981 | Danish coffee table in teak by Jacob Nielsen & Sonner Møbelf | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08008.jpg?v=1780052212" alt="Ct3-290526" width="60"> | LC6 | Ct3-290526 | 0420010645 | Danish coffee table in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08445.jpg?v=1774354991" alt="CT1-240326" width="60"> | LC6 | CT1-240326 | 52565522 | Danish coffee table in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08075.jpg?v=1780052538" alt="Ct10-290526" width="60"> | LC8 | Ct10-290526 | 0420010044 | Danish oval coffee table in solid teak in by Dyrlund | Teak | 1 |

### Dining Chairs — 3 items (16 units)

**Rule — Set size: 4 · Upholstery: Down · Wood group: Teak** · counts 4 units across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08198_458d911a-05e4-4170-9a32-37e326fcb32d.jpg?v=1787223398" alt="Ch3-200826" width="60"> | LC1 | Ch3-200826 | 0000612 | Danish dining chairs in teak | Teak | 4 |

**Rule — Set size: 4 · Upholstery: Up & Down · Wood group: Light** · counts 4 units across 1 item · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC06343_72d16869-070a-46e7-8b58-ba62a939bbc7.jpg?v=1786625183" alt="Ch2-130826" width="60"> | LC1 | Ch2-130826 | 0000581 | Danish dining chairs by Høng Stolefabrik | Oak | 4 |

**Rule — Set size: 8 · Upholstery: Up & Down · Wood group: Teak** · counts 8 units across 1 item · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09946.jpg?v=1788261110" alt="Ch4-010926" width="60"> | LC1 | Ch4-010926 | 0000924 | A rare set of Danish dining chairs in teak by Erik Buch for | Teak | 8 |

### Dining Tables — 5 items (5 units)

**Rule — Shape: Oval · Wood group: Light** · counts 3 units across 3 items · status: extra in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC06652.jpg?v=1779272874" alt="T4-200526" width="60"> | LC10 | T4-200526 | 97425692 | Danish dining table in solid oak by Skovby Møbelfabrik | Oak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/6DC905FB-7E17-4BB0-A03F-8587A22BFF20.jpg?v=1748415872" alt="T4 28.05" width="60"> | LC13 | T4 28.05 | 18084558 | Danish oval dining table in oak by Skovby | Oak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02145_954230d6-c73d-4c5b-90b3-1facea1b2dfb.jpg?v=1784030043" alt="T2-140726" width="60"> | LC8 | T2-140726 | 0001074 | Danish oval dining table in smoked oak by Skovby | Oak | 1 |

**Rule — Shape: Round · Wood group: Dark** · counts 2 units across 2 items · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/0714187D-4CD5-4FEB-A3DD-FDCBA6217CF9.jpg?v=1749624817" alt="T1 11.06" width="60"> | LC9 | T1 11.06 | 30252217 | Round dining table in Santos rosewood by Omann Jun, 1950s-60 | Santos Rosewood | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/D78DB6C4-BEE6-4F57-8120-BA2A9EED34E6.jpg?v=1751439329" alt="T1 02.07" width="60"> | LC9 | T1 02.07 | 55922741 | Danish round dining table in Santos rosewood | Santos Rosewood | 1 |

### Highboards — 4 items (4 units)

**Rule — Wood group: Teak** · counts 4 units across 4 items · status: extra in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08550_c5f1f14f-a93c-44c9-a0f5-38c541c29b9a.jpg?v=1787654187" alt="Hb3-250825" width="60"> | LC2 | Hb3-250825 | 0001375 | Danish highboard in teak, by Clauson & Son for Silkeborg | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02471.jpg?v=1784198655" alt="Hb1-160726" width="60"> | LC3 | Hb1-160726 | 0000964 | Danish highboard in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC07114_c2eeb1aa-d425-4302-8482-9098332ce58e.jpg?v=1786963988" alt="Hb1-170826" width="60"> | LC3 | Hb1-170826 | 0000902 | Danish highboard in teak and oak | Teak, Oak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/qDSC00349.jpg?v=1775647957" alt="Hb1-080426" width="60"> | LC3 | Hb1-080426 | 15294091 | Danish highboard in teak | Teak | 1 |

### Nest Of Tables — 4 items (4 units)

**Rule — Wood group: Dark** · counts 2 units across 2 items · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03590_b62098f6-0860-4129-87e2-5b45725721a3.jpg?v=1777893498" alt="Nt3-040526" width="60"> | LC4 | Nt3-040526 | 15952216 | Danish set of nest of tables in Santos rosewood by Kvalitet | Santos Rosewood | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC04671.jpg?v=1785238773" alt="Nt1-280726" width="60"> | LC4 | Nt1-280726 | 0000833 | Danish set of nest of tables in Santos rosewood by Kvalitet | Santos Rosewood | 1 |

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC06763_880f010b-be3d-45ba-a4e1-59d4e128f9da.jpg?v=1786625704" alt="Nt1-130826" width="60"> | LC4 | Nt1-130826 | 0000961 | Swedish set of nest of tables in oak | Oak | 1 |

**Rule — Wood group: Teak** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09644.jpg?v=1783081312" alt="Nt2-030726" width="60"> | LC4 | Nt2-030726 | 0020010038 | Danish nest of tables in teak and walnut | Teak, Walnut | 1 |

### Secretary Cabinets — 6 items (6 units)

**Rule — Wood group: Teak** · counts 6 units across 6 items · status: extra in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08574.jpg?v=1774354864" alt="Sc1-240326" width="60"> | LC7 | Sc1-240326 | 73565522 | Danish secretary in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02456.jpg?v=1776855616" alt="Sc1-220426" width="60"> | LC7 | Sc1-220426 | 31488482 | Danish secretary in teak by G. Falsig for Möbelfabrik Holste | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00821_77850924-a3c2-44f3-be0e-70600fb50a50.jpg?v=1783428822" alt="Sc1-070726" width="60"> | LC8 | Sc1-070726 | 0000061 | Danish secretary in teak | Teak, Walnut | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC04062.jpg?v=1778152181" alt="Sc1-070526" width="60"> | LC8 | Sc1-070526 | 92642382 | Danish secretary in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03064.jpg?v=1777288529" alt="Sc1-270426" width="60"> | LC8 | Sc1-270426 | 34538765 | Danish secretary in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC07461.jpg?v=1773927113" alt="Scr1-190326" width="60"> | LC8 | Scr1-190326 | 47685694 | Danish secretary in teak | Teak, Beech | 1 |

### Side Tables — 16 items (19 units)

**Rule — Wood group: Dark** · counts 11 units across 10 items · status: extra in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02047_61e2ae2d-8eb8-4626-8ab7-2d9200d04c6f.jpg?v=1784029841" alt="St2-140726" width="60"> | LC4 | St2-140726 | 0000832 | Swedish side tables in walnut, model 'Dallas' by Anders Löfg | Walnut | 2 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03143_737c78d5-a37f-4ac6-86a3-297e1548db4f.jpg?v=1784634227" alt="St7-210726" width="60"> | LC4 | St7-210726 | 0000851 | Swedish side table in Santos rosewood by Svenska Möbelfabrik | Santos Rosewood | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC09534.jpg?v=1768300749" alt="St4 13.01" width="60"> | LC4 | St4 13.01 | 251119182706 | Swedish side table in walnut by AB Westbergs | Walnut, Beech | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/1DSC07304.jpg?v=1765886700" alt="Sb1-160526" width="60"> | LC4 | Sb1-160526 | 90618422 | Swedish side table in Santos rosewood | Santos Rosewood | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09862_718119fe-688a-4b34-b464-1ddd62f22fd7.jpg?v=1783082083" alt="St14-030726" width="60"> | LC5 | St14-030726 | 0000817 | Swedish side table in walnut, beech and teak | Santos Rosewood, Beech, Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01364_1f31eeb2-aaf6-4f95-add3-3f96fb3e79b8.jpg?v=1783673679" alt="St2-100726" width="60"> | LC5 | St2-100726 | 0001061 | Swedish side table in walnut | Walnut | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03867.jpg?v=1778065516" alt="St1-060526" width="60"> | LC5 | St1-060526 | 77637573 | Swedish side table in walnut | Walnut | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC09543.jpg?v=1768300796" alt="St5 13.01" width="60"> | LC5 | St5 13.01 | 251119182758 | Swedish side table in walnut & beech by AB Westbergs | Walnut, Beech | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC06112_27fb6960-4c51-42f8-824b-98d5361912db.jpg?v=1786016521" alt="St2-060826" width="60"> | LC5 | St2-060826 | 0001257 | Swedish side table in Santos rosewood by Allbo Möbler AB in | Santos Rosewood | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08771_af5bb759-056a-40d2-a218-0f89c28a811a.jpg?v=1787741834" alt="CT1-260826" width="60"> | LC5 | CT1-260826 | 0001498 | Swedish table in walnut | Walnut | 1 |

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02552_c42f1b90-1aa4-44e3-847c-ae85de311dd1.jpg?v=1784199546" alt="CT1-160726" width="60"> | LC5 | CT1-160726 | 0000863 | Swedish side table in oak | Oak | 1 |

**Rule — Wood group: Teak** · counts 7 units across 5 items · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC03260.jpg?v=1771338195" alt="St1 17.02" width="60"> | LC12 | St1 17.02 | 260216144040 | Denmark side tables in teak | Teak | 2 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09768.jpg?v=1783081866" alt="St10-030726" width="60"> | LC4 | St10-030726 | 68498392 | Swedish side tables in teak | Teak | 2 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09667_71849588-d5e9-435a-a861-941db9372fe0.jpg?v=1783081471" alt="St2-030726" width="60"> | LC4 | St2-030726 | 0000566 | Swedish side table in teak and beech | Teak, Beech | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00883_6798b590-e480-4953-ba75-2bf792005833.jpg?v=1783598346" alt="N2-090726" width="60"> | LC4 | N2-090726 | 0520010070 | Swedish telephone shelf / side table in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03088_8585c108-21af-4cbc-a04f-30c9a7065486.jpg?v=1784634019" alt="St4-210726" width="60"> | LC4 | St4-210726 | 0000864 | Danish side table in teak by Niels Bach | Teak | 1 |

### Sideboards — 7 items (7 units)

**Rule — Wood group: Dark** · counts 2 units across 2 items · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03040.jpg?v=1777288470" alt="Sb1-270426" width="60"> | LC1 | Sb1-270426 | 1120010007 | Danish sideboard in Santos rosewood by Kurt Ostervig | Santos Rosewood | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03196_f7ba3d2f-45ae-4443-864c-d5a9cab4c542.jpg?v=1784634305" alt="Sb2-210726" width="60"> | LC4 | Sb2-210726 | 0001087 | Swedish sideboard / TV-bench in Santos rosewood, model 'Exce | Santos Rosewood | 1 |

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/42331C55-D018-48F5-A762-E046816FF30E.jpg?v=1756717012" alt="Sb1 01.09" width="60"> | LC2 | Sb1 01.09 | 31810030 | Swedish sideboard in teak | Beech | 1 |

**Rule — Wood group: Teak** · counts 4 units across 4 items · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03816.jpg?v=1778065454" alt="Sb3-060526" width="60"> | LC2 | Sb3-060526 | 37637573 | Danish sideboard in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09865.jpg?v=1775136448" alt="Sb1-020426" width="60"> | LC2 | Sb1-020426 | 260327145941 | Danish sideboard in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00040_4c42377d-e5f0-44ab-bb05-e20e132ea89e.jpg?v=1788261268" alt="Sb2-010926" width="60"> | LC2 | Sb2-010926 | 1529 | Swedish sideboard in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC07338.jpg?v=1779450751" alt="Sb4-220526" width="60"> | LC3 | Sb4-220526 | 30794440 | Swedish sideboard in teak by Hisingens Möbelaffär | Teak | 1 |

### Sofas — 1 item (1 unit)

**Rule — Wood type: any** · counts 1 unit across 1 item · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03305.jpg?v=1777457574" alt="S1-290426" width="60"> | LC12 | S1-290426 | 54883984 | Swedish sofa in solid elm, model 'Värend' by Carl Malmsten | Elm | 1 |

### Stools — 1 item (1 unit)

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08491_2eca6842-b6f4-4b91-b195-013bca95fa94.jpg?v=1780475824" alt="Fst2-030626" width="60"> | LC1 | Fst2-030626 | 76530580 | Swedish stool in beech | Beech | 1 |

### Storage Cabinets — 4 items (4 units)

**Rule — Wood group: Light** · counts 1 unit across 1 item · status: low in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/7AF38DC2-6C6D-43F1-9EC6-720CF80BD182.jpg?v=1778934428" alt="Bsh4 16.05" width="60"> | LC0 | Bsh4 16.05 | 9170424040571 | Cabinet "Undantaget in oak by Carl Malmsten for Åfors Möbelf | Beech | 1 |

**Rule — Wood group: Teak** · counts 3 units across 3 items · status: medium in stock

| Image | Shelf | SKU | Barcode | Item | Wood type | Units |
|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC04098.jpg?v=1778152252" alt="BSh1-070526" width="60"> | LC0 | BSh1-070526 | 260226155412 | Swedish storage cabinet in teak, model 'Sörgården' by Bertil | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC02900.jpg?v=1770991315" alt="Sb1 13.02" width="60"> | LC0 | Sb1 13.02 | 260210085647 | Danish corner cabinet in teak | Teak | 1 |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08002_3acb4e42-4430-47bb-833a-517815759adc.jpg?v=1787223303" alt="Cb1-200826" width="60"> | LC8 | Cb1-200826 | 0001366 | Danish cabinet in teak | Teak | 1 |

> Where a rule shows more units than items, the item is a set — for example one listing of four
> chairs counts as 1 item and 4 units.

---

## Items NOT being counted

### Bar Cabinets — 4 items

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09971_b7bd3061-3621-4664-aba6-4f210ca34547.jpg?v=1783082778" alt="Hb1-030726" width="60"> | LC3 | Hb1-030726 | 39498392 | Bar cabinet in teak by Arne Wahl Iversen for IKEA, m | Teak | 1 | There is no stock rule for **Bar Cabinets** at all. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC04474.jpg?v=1771846980" alt="Sb1 230226" width="60"> | LC4 | Sb1 230226 | 260218101408 | Danish corner bar cabinet in teak | Teak | 1 | There is no stock rule for **Bar Cabinets** at all. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03777.jpg?v=1778065131" alt="Cb1-060526" width="60"> | LC8 | Cb1-060526 | 56637573 | Danish corner bar cabinet in teak by Omann Jun Møbel | Teak | 1 | There is no stock rule for **Bar Cabinets** at all. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC04318.jpg?v=1778225251" alt="Cb1-080526" width="60"> | LC8 | Cb1-080526 | 93642382 | Danish corner bar cabinet in teak by Omann Jun Møbel | Teak | 1 | There is no stock rule for **Bar Cabinets** at all. |

### Bookshelves — 1 item

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2ADA8927-5699-4A63-9176-E2B8B933FE9A.jpg?v=1754303359" alt="BSh3 01.08" width="60"> | LC0 | BSh3 01.08 | 11281567 | Swedish bookshelf, 'Guide' by Niels Gammelgaard for | — | 1 | No **Wood type** is recorded on the item, so it belongs to no wood group. |

### Chest of Drawers — 4 items

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC07522_d9aaf8d0-7abf-4c96-8ad0-d857a954a446.jpg?v=1787050984" alt="ChD2-180826" width="60"> | LC8 | ChD2-180826 | 0001373 | Danish chest of drawers in teak by Thorsø Møbel & Ma | Teak, Walnut | 1 | **Weight** is “21-40 kg”, but the rule tracks 41-60 kg. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09755_23f5de2d-c71e-4d15-b154-42055bad88f2.jpg?v=1788171045" alt="Sb1-310826" width="60"> | LC8 | Sb1-310826 | 0001493 | Swedish sideboard in smoked oak | Oak | 1 | **Weight** is “21-40 kg”, but the rule tracks 41-60 kg. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09787.jpg?v=1788171047" alt="Sb2-310826" width="60"> | LC8 | Sb2-310826 | 0001494 | Swedish sideboard in smoked oak | Oak | 1 | **Weight** is “21-40 kg”, but the rule tracks 41-60 kg. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC03209.jpg?v=1771337374" alt="Sc1 17.02" width="60"> | LC8 | Sc1 17.02 | 260213110825 | Danish secretary in teak | Teak | 1 | **Weight** is “21-40 kg”, but the rule tracks 41-60 kg. |

### Dining Chairs — 30 items

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00964.jpg?v=1775737139" alt="Ch15-090426" width="60"> | LC0 | Ch15-090426 | 87392074 / 17733559 | Danish dining chairs in teak | Teak | 2 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09189.jpg?v=1782473044" alt="Ch51-260626" width="60"> | LC0 | Ch51-260626 | 01200101981 | Danish single dining chair in teak and walnut | Teak | 1 | **Set size** is “1”, but the rule tracks 4. The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/1DSC07475.jpg?v=1766146310" alt="Ch1 19.12" width="60"> | LC1 | Ch1 19.12 | 76524057 | Danish dining chairs in teak and oak by Knud Faerch | Teak, Oak | 6 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/1DSC08127.jpg?v=1766493513" alt="Ch1 23.12" width="60"> | LC1 | Ch1 23.12 | 251201155217 | Danish dining chairs in walnut by Duba möbelindustri | Walnut | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC04369.jpg?v=1771847295" alt="Ch2 230226" width="60"> | LC1 | Ch2 230226 | 260120090941 | Danish dining chairs in teak and walnut | Teak, Walnut | 2 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC06549.jpg?v=1773244504" alt="Ch1-110326" width="60"> | LC1 | Ch1-110326 | 57825150 | Set of 2 danish chairs in oak, 'model 49' by Erik Bu | Oak | 2 | **Set size** is “2”, but the rule tracks 4. The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02803.jpg?v=1776949970" alt="Ch5-230426" width="60"> | LC1 | Ch5-230426 | 0120010149 | Danish dining chair in teak by Arne Hovmand Olsen | Teak | 2 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01122.jpg?v=1775817385" alt="Ch2-100426" width="60"> | LC1 | Ch2-100426 | 10165834 | Danish dining chairs in stained teak | Teak | 2 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00951.jpg?v=1775736960" alt="Ch14-090426" width="60"> | LC1 | Ch14-090426 | 36180614 | Dining chair in teak & beech by Farstrup | Teak, Beech | 1 | **Set size** is “1”, but the rule tracks 4. The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00761.jpg?v=1775735942" alt="Ch4 10.09/ch4-090426" width="60"> | LC1 | Ch4 10.09/ch4-090426 | 79912007 | Italian set of 2 dining chairs by Marcel Breuer, mod | Beech | 2 | **Set size** is “2”, but the rule tracks 4. The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00746.jpg?v=1775735885" alt="Ch3-090426" width="60"> | LC1 | Ch3-090426 | 77502191 | Swedish dining chair in teak | Teak | 1 | **Set size** is “1”, but the rule tracks 4. The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01355.jpg?v=1776079228" alt="Ch7-130426" width="60"> | LC1 | Ch7-130426 | 65344135 | Danish dining chairs in stained beech by Erik Buch f | Mahogany | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/467C3D08-0D7E-4745-87A2-26A3E1CE68FB.jpg?v=1751537804" alt="Ch5 03.07" width="60"> | LC1 | Ch5 03.07 | 44268055 | Danish set of 4 dining chairs in teak by Henning Kjæ | Teak | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02784.jpg?v=1776949894" alt="Ch4-230426" width="60"> | LC1 | Ch4-230426 | 85478711 | Danish dining chairs in Santos rosewood by Arne Vodd | Santos Rosewood | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01317_c34aa98e-9a0d-4cef-a489-e6d5323199b3.jpg?v=1783599641" alt="Ch7-090726" width="60"> | LC1 | Ch7-090726 | 0120010228 | Danish dining chairs in solid walnut by Erik Buch fo | Walnut | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/4DC2FCDC-690A-4262-85C2-9994712AD4CB.jpg?v=1758273775" alt="Ch4 19.09" width="60"> | LC1 | Ch4 19.09 | 0120010081 | Danish dining chairs in teak | — | 1 | **Set size** is “1”, but the rule tracks 4. The item has no **Upholstery** recorded. No **Wood type** is recorded on the item, so it belongs to no wood group. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00903.jpg?v=1775734202" alt="Ch10-090426" width="60"> | LC1 | Ch10-090426 | 251015163325 | Swedish dining chairs in teak by Karl-Erik Ekselius | Teak | 1 | **Set size** is “1”, but the rule tracks 4. The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02730_4990a0b7-aeb4-41a2-b340-5ade9ff76230.jpg?v=1784280712" alt="Ch2-170726" width="60"> | LC1 | Ch2-170726 | 0120010239 | Danish dining chairs in teak/oak and beech by Farstr | Teak, Beech, Oak | 6 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC06145.jpg?v=1778755470" alt="Ch5-140526" width="60"> | LC1 | Ch5-140526 | 260413131602 | Danish set of 7 dining chairs by Erik Buch for Nova | Oak | 7 | **Set size** is “7”, but the rule tracks 4. The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC03403.jpg?v=1777538650" alt="Ch4-300426" width="60"> | LC1 | Ch4-300426 | 260324111452 | Danish set of 4 dining chairs in teak by Henry Walte | Teak | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02186.jpg?v=1776684295" alt="Ch10-200426" width="60"> | LC1 | Ch10-200426 | 260310093024 | Danish dining chairs in teak by Findahl | Teak | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02838_768d9d6a-3b79-4f19-8979-da05cbdfd1e6.jpg?v=1784280931" alt="Ch5-170726" width="60"> | LC1 | Ch5-170726 | 0120010232 | Danish dining chairs in solid teak | Teak | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC04587.jpg?v=1778497524" alt="Ch1-110526" width="60"> | LC1 | Ch1-110526 | 34533125 | Danish set of 4 dining chairs 'model 71' by Niels O. | Teak | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08300_2164507e-c33a-42a1-ae8d-78d9782db2e0.jpg?v=1787223429" alt="Ch7-200826" width="60"> | LC1 | Ch7-200826 | 0000999 | Danish dining chair in teak and beech by Ib Kofod-La | Teak, Beech | 2 | **Set size** is “2”, but the rule tracks 4. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08316_2a2a4b28-a79f-49e0-b384-5042c293ad29.jpg?v=1787223431" alt="Ch8-200826" width="60"> | LC1 | Ch8-200826 | 0000918 | Danish dining chairs in Santos rosewood by Bernhard | Santos Rosewood | 2 | **Set size** is “2”, but the rule tracks 4. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09609_825a2cf5-eb16-41e7-af72-42f36a4f81e7.jpg?v=1787915477" alt="Ch2-280826" width="60"> | LC1 | Ch2-280826 | 0000926 | Danish dining chairs in Santos rosewood and walnut b | Santos Rosewood, Walnut | 2 | **Set size** is “2”, but the rule tracks 4. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC08799.jpg?v=1774443588" alt="Ch7-250326" width="60"> | LC1 | Ch7-250326 | 260226155946 | Danish dining chairs in walnut 'Sonja Chair' by Joha | Walnut | 6 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09910.jpg?v=1788260873" alt="Ch3-010926" width="60"> | LC1 | Ch3-010926 | 0000607 | Danish dining chairs in Santos rosewood by Johannes | Santos Rosewood | 5 | **Set size** is “5”, but the rule tracks 4. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00555_aaf0d8c8-ab90-48a3-ad6a-639883196f93.jpg?v=1783337039" alt="Ch6-060726" width="60"> | LC1 | Ch6-060726 | 0003 | Danish dining chairs in Santos rosewood by Findahl | Santos Rosewood | 4 | The item has no **Upholstery** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC09131.jpg?v=1782472970" alt="Ch2-260626" width="60"> | LC1 | Ch2-260626 | 260516120739 | Danish dining chairs 'model 71' by Niels O. Moller f | Teak | 4 | The item has no **Upholstery** recorded. |

### Dining Tables — 8 items

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC02676.jpg?v=1776949596" alt="T1-230426" width="60"> | LC0 | T1-230426 | 260416084405 | Swedish round dining table in oak by Svante Skogh, m | Oak | 1 | The item has no **Shape** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/beyo-vintage-default-title-danish-dining-table-in-teak-by-naestved-mobelfabrik-51824308846922.jpg?v=1775572946" alt="V10 20.02" width="60"> | LC10 | V10 20.02 | 65441403 | Danish dining table in teak by Næstved Møbelfabrik | — | 1 | The item has no **Shape** recorded. No **Wood type** is recorded on the item, so it belongs to no wood group. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/beyo-vintage-default-title-danish-dining-table-in-teak-and-oak-by-ej-naestved-51902215979338.jpg?v=1775572947" alt="T1 26.02 mässan" width="60"> | LC10 | T1 26.02 mässan | 7650675101471 | Danish dining table in teak and oak by EJ Næstved | — | 1 | The item has no **Shape** recorded. No **Wood type** is recorded on the item, so it belongs to no wood group. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01014.jpg?v=1775815513" alt="T4-100426" width="60"> | LC10 | T4-100426 | **⚠️ No barcode** | Danish oval dining table in mahogany by Skovby Møbel | Mahogany | 1 | The item has no **Shape** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC01602.jpg?v=1776319992" alt="T4-150426" width="60"> | LC10 | T4-150426 | 36539173 | Danish oval dining table in mahogany by Skovby Møbel | Mahogany | 1 | The item has no **Shape** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/61113BFA-B157-45F1-962C-596D55EE519F.jpg?v=1750754042" alt="T3 24.06" width="60"> | LC9 | T3 24.06 | 55930751 | Round dining table "model nr. 55" with 3 ext by Oman | Santos Rosewood | 1 | The item has no **Shape** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/986A35FF-1641-4633-A26A-96543331B958.jpg?v=1760433720" alt="T9 24.06" width="60"> | LC9 | T9 24.06 | **⚠️ No barcode** | Danish round dining table in Santos rosewood by Oman | Santos Rosewood | 1 | The item has no **Shape** recorded. |
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/097F5409-1489-4A0D-A3B8-7C9B37F00CF4.jpg?v=1760433817" alt="T5 17.06" width="60"> | LC9 | T5 17.06 | **⚠️ No barcode** | Danish round dining table in Santos rosewood by Oman | Santos Rosewood | 1 | The item has no **Shape** recorded. |

### Hall Tables — 1 item

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC03168.jpg?v=1771244425" alt="N1 16.02" width="60"> | LC4 | N1 16.02 | 260121161245 | Plant stand / piedistal in pine wood | — | 1 | No **Wood type** is recorded on the item, so it belongs to no wood group. |

### Seating Benches — 1 item

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/2DSC03333.jpg?v=1771337598" alt="Bnch1 17.02" width="60"> | LC5 | Bnch1 17.02 | 260216144641 | Bench in solid teak by Yngvar Sandström for Seffle M | Teak | 1 | There is no stock rule for **Seating Benches** at all. |

### Serving Trolleys — 1 item

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC06086_ddd60839-95df-444c-968b-15b4120f88a3.jpg?v=1786016516" alt="St1-060826" width="60"> | LC6 | St1-060826 | 0000850 | Swedish serving trolley / side table in teak | Teak | 1 | There is no stock rule for **Serving Trolleys** at all. |

### unknown — 1 item

| Image | Shelf | SKU | Barcode | Item | Wood type | Units | Why it is not counted |
|---|---|---|---|---|---|---|---|
| <img src="https://cdn.shopify.com/s/files/1/0814/7238/9450/files/DSC00846_50041254-abca-40ef-81a0-c97c93539504.jpg?v=1783598231" alt="Bv1-090726" width="60"> | LC5 | Bv1-090726 | 90491722 | Swedish doll stroller in chrome by Emmaljunga | — | 1 | There is no stock rule for **unknown** at all. |

---

## What would change the picture

Most uncounted items are uncounted because the product listing is missing a field the rule asks
for. The table says how many would start being counted if **one** field were filled in — nothing
else about the setup would need to change.

| Items | Fill in this one field on the listing |
|---:|---|
| 18 | Upholstery |
| 6 | Shape |
| 2 | Wood group |

A further **2 items** would be counted, but need **more than one** field filled in:

| Shelf | SKU | Category | Fields still blank |
|---|---|---|---|
| LC10 | V10 20.02 | Dining Tables | Shape, Wood group |
| LC10 | T1 26.02 mässan | Dining Tables | Shape, Wood group |

**7 items** sit in categories with no stock rule at all (Bar Cabinets, Seating Benches, Serving Trolleys, unknown). Whether these should be tracked is a business decision, not a data fix.

**16 items** cannot be counted no matter how complete the listing is, because
no rule covers what they actually are. Counting these needs a **new stock rule**:

| Shelf | SKU | Category | What it is | Why no rule fits |
|---|---|---|---|---|
| LC8 | ChD2-180826 | Chest of Drawers | Weight 21-40 kg · Wood type Teak, Walnut | no rule tracks Weight “21-40 kg” |
| LC8 | Sb1-310826 | Chest of Drawers | Weight 21-40 kg · Wood type Oak | no rule tracks Weight “21-40 kg” |
| LC8 | Sb2-310826 | Chest of Drawers | Weight 21-40 kg · Wood type Oak | no rule tracks Weight “21-40 kg” |
| LC8 | Sc1 17.02 | Chest of Drawers | Weight 21-40 kg · Wood type Teak | no rule tracks Weight “21-40 kg” |
| LC0 | Ch51-260626 | Dining Chairs | Set size 1 · Wood type Teak | no rule tracks Set size “1” |
| LC1 | Ch1-110326 | Dining Chairs | Set size 2 · Wood type Oak | each property is tracked somewhere, but no single rule combines them |
| LC1 | Ch14-090426 | Dining Chairs | Set size 1 · Wood type Teak, Beech | no rule tracks Set size “1” |
| LC1 | Ch4 10.09/ch4-090426 | Dining Chairs | Set size 2 · Wood type Beech | each property is tracked somewhere, but no single rule combines them |
| LC1 | Ch3-090426 | Dining Chairs | Set size 1 · Wood type Teak | no rule tracks Set size “1” |
| LC1 | Ch4 19.09 | Dining Chairs | Set size 1 | no rule tracks Set size “1” |
| LC1 | Ch10-090426 | Dining Chairs | Set size 1 · Wood type Teak | no rule tracks Set size “1” |
| LC1 | Ch5-140526 | Dining Chairs | Set size 7 · Wood type Oak | no rule tracks Set size “7” |
| LC1 | Ch7-200826 | Dining Chairs | Set size 2 · Upholstery Down · Wood type Teak, Beech | each property is tracked somewhere, but no single rule combines them |
| LC1 | Ch8-200826 | Dining Chairs | Set size 2 · Upholstery Down · Wood type Santos Rosewood | each property is tracked somewhere, but no single rule combines them |
| LC1 | Ch2-280826 | Dining Chairs | Set size 2 · Upholstery Down · Wood type Santos Rosewood, Walnut | each property is tracked somewhere, but no single rule combines them |
| LC1 | Ch3-010926 | Dining Chairs | Set size 5 · Upholstery Up & Down · Wood type Santos Rosewood | no rule tracks Set size “5” |

## How wood groups work

Most rules select a **wood group** rather than one named wood:

| Group | Woods it covers |
|---|---|
| **Dark** | Mahogany, Santos Rosewood, Dark Oak, Dark Teak, Walnut |
| **Teak** | Teak, Cherry |
| **Light** | Oak, Beech, Pine, Birch, Elm |

When a listing names several woods, **only the first one counts**. A piece listed as
“Teak, Beech” is treated as Teak, not as Light. A wood that belongs to no group (currently only
“Other”) is not picked up by any group rule.
