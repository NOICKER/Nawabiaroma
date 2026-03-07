export interface StoreProduct {
    id: string;
    number: string;
    displayName: string;
    name: string;
    nameSub: string;
    category: string;
    size: string;
    price: string;
    priceValue: number;
    tagline: string;
    description: string;
    source: string;
    image: string;
    glowColor: string;
    delay?: string;
    notes: {
        top: string[];
        heart: string[];
        base: string[];
    };
}

export const storeProducts: StoreProduct[] = [
    {
        id: 'discovery-set',
        number: 'N\u00B0. 00 \u2014 Introduction',
        displayName: 'DISCOVERY SET',
        name: 'DISCOVERY',
        nameSub: 'SET',
        category: '3 x 10ml Set',
        size: '3 x 10ML \u2014 Discovery Set',
        price: '\u20B92,400',
        priceValue: 2400,
        tagline: 'Three compositions in miniature, designed to be worn before you commit to a full bottle.',
        description: 'The Discovery Set gathers the house signatures into a single presentation so you can test the collection over several days before opening a full-size bottle.',
        source: 'Curated in Mumbai, IN',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMrT3RMQocO-khmZzuXBFTv7sR4v5bRecN26lsg1oWl0mrSlAMXXkBvkgRe3R1PqZmjbd7hGxfzLzt_9-eYpdm0phKuqJ2LT7J9OO2BOdD5yv8KsE2XnOeUoNBOQ3Gz8xq2HYcIN6AGn0way-lgZxJh9k5ES86EQJyfcnI929V7BE7b1GS0udAuKXF5Js7fq86nOwAezKajZfuOFA2kr4P6WFaceWpK-bV2e1aGByjoQ8eruTGTVSh_TqOKZt8TUcXRil2lgaKzEs',
        glowColor: 'bg-gradient-to-tr from-stone-100 to-white dark:from-white/5 dark:to-white/5',
        delay: '0.2s',
        notes: {
            top: ['Santal 01', 'Rose Noir'],
            heart: ['Oud Imperial', 'Vetiver 44'],
            base: ['Amber Dust', 'Cedar Sky'],
        },
    },
    {
        id: '1',
        number: 'N\u00B0. 01 \u2014 Signature Edition',
        displayName: 'SANTAL 01',
        name: 'SANTAL',
        nameSub: '01',
        category: 'Eau de Parfum',
        size: '50ML \u2014 Eau de Parfum',
        price: '\u20B98,500',
        priceValue: 8500,
        tagline: 'Soft woods and cool cardamom unfold like light passing through carved stone.',
        description: 'Santal 01 is built around dry sandalwood, bright iris, and a restrained spice profile that stays close to the skin without losing projection.',
        source: 'Captured in Jaipur, IN',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7d_skVqwlzVu88d1Eeu9eFCQHX6Lm-tPUm08DEEus5Jz2qTHP4LYTPD1PQEwPtf6op7wPldFsx-JXKvX96Gi2KTSVu-zjnqYzOI_nq-FHN-9rE-XgZ7ziVYsu1FqSPD4Yc0ZCjhNU39KtWNRQPduiVng5j62DS1HanE2p9o5zOTbFnBmi4W5ierod4lcY14pes2Ds7Azrdcyx8jKXVBtEyt5mUbi6TsFOhQkfEpaqof-zUGhji2v77-kxd9CQgvMTIE3dXNiM0Bw',
        glowColor: 'bg-gradient-to-tr from-gray-100 to-white dark:from-white/5 dark:to-white/5',
        delay: '0.3s',
        notes: {
            top: ['Green Cardamom', 'Bergamot'],
            heart: ['Iris Concrete', 'Cedar Smoke'],
            base: ['Mysore Sandalwood', 'Ambrette', 'Cashmere Musk'],
        },
    },
    {
        id: '2',
        number: 'N\u00B0. 02 \u2014 After Dusk',
        displayName: 'ROSE NOIR',
        name: 'ROSE',
        nameSub: 'NOIR',
        category: 'Extrait de Parfum',
        size: '50ML \u2014 Extrait de Parfum',
        price: '\u20B99,200',
        priceValue: 9200,
        tagline: 'A velvet rose accord cut with dark fruit and mineral smoke.',
        description: 'Rose Noir pares the flower back to its inky core, pairing jammy petals with incense, patchouli, and a faint metallic brightness.',
        source: 'Captured in Grasse, FR',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_ENe7uWp_p-50HA55M91KBx2USMgeuZcESr9rfs9RgSQOKmchup4zpaHTpywwAoFacZeUrhb-2py_fDHoo0qwe2ar36ENkVAJ17wwelusaUICra_jqCpDZC5Cr5QrGYIq8ZtqIbrpO1GQ9sokqh3fswkF2fzrFaKYnW1tmwBF2Uieolt5bA3rZ4zZ0Wu7dk2QdTjKUZL5QMuTwYn1KcIGBGojbC2DxsoKAnQcw4PYv0UakasWi63LfU45Sk9GEyxCu2uK72XGzyM',
        glowColor: 'bg-gradient-to-tr from-rose-50 to-white dark:from-rose-500/5 dark:to-rose-500/5',
        delay: '0.4s',
        notes: {
            top: ['Blackcurrant', 'Turkish Rose'],
            heart: ['Damask Rose', 'Labdanum'],
            base: ['Patchouli', 'Incense', 'Black Musk'],
        },
    },
    {
        id: '3',
        number: 'N\u00B0. 04 \u2014 Private Reserve',
        displayName: 'OUD IMPERIAL',
        name: 'OUD',
        nameSub: 'IMPERIAL',
        category: 'Eau de Parfum',
        size: '100ML \u2014 Extrait de Parfum',
        price: '\u20B912,000',
        priceValue: 12000,
        tagline: 'Smoked wood meets morning dew. An architectural study of resin and light.',
        description: 'Oud Imperial strips away the ornamental excess of traditional perfumery to reveal the raw, vibrating core of precious agarwood.',
        source: 'Captured in Grasse, FR',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCyib8HmT77W76QZ7nE5PAdbRSdpVRfjhl_RQTHhKTgYGlkfnssABxm16HsCX7qROeBxe6PdwEz_O1IxJ-Ws1RT4XRVxRNoJAHgM2Kh66cTJlkzZMiQMoSNMEjQm4o0PzdbWeGNaJP0pcVQ4WFnp0C2SnAAk2CC4lNacssulRhOXyzWutBEzZZE2rOEpxwAd50Fqk-zfDUe8ODZ2HNxlFnJQdicEbvPn69rx7VnA-vLXc4DWy0o4okpGYTl-z-Y2boI5RY4QJRDHZY',
        glowColor: 'bg-gradient-to-tr from-amber-50 to-transparent dark:from-amber-500/5 dark:to-amber-500/5',
        delay: '0.5s',
        notes: {
            top: ['Italian Bergamot', 'Pink Pepper'],
            heart: ['Kashmiri Saffron', 'White Amber'],
            base: ['Aged Oud', 'Haitian Vetiver', 'White Musk'],
        },
    },
    {
        id: '4',
        number: 'N\u00B0. 05 \u2014 Jardin Study',
        displayName: 'VETIVER 44',
        name: 'VETIVER',
        nameSub: '44',
        category: 'Cologne',
        size: '75ML \u2014 Cologne',
        price: '\u20B98,800',
        priceValue: 8800,
        tagline: 'Crushed leaves, wet earth, and a cool citrus lift.',
        description: 'Vetiver 44 balances green bitterness with airy musk, keeping the composition bright, dry, and deliberately understated.',
        source: 'Captured in Kochi, IN',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkiqLKRUGdtFZPeoU_-7pnvdIXNh723Lo5HBzJcvwu0mx1UfDigTa0ElGSeUoigf9cI5QyIJe2zio21UiruplDe4wyiNLIerKIlMXwJKXvN1ps83X4XulP9HJOg77ZyYbH93Y02HuYszQ_9SIZ4ByFGbyrP61_mUbgvyBwTiNe7TRJ2fsH72Chnefzy07X8NX73lmO-1fxgMep5Bk4Oyp2hLCfHZbi4dxkW8kfoTNw-h5pompBLes8xNWbF0bELoxytLWj1miMUkc',
        glowColor: 'bg-gradient-to-tr from-emerald-50 to-white dark:from-emerald-500/5 dark:to-emerald-500/5',
        delay: '0.6s',
        notes: {
            top: ['Petitgrain', 'Lemon Zest'],
            heart: ['Green Tea', 'Neroli'],
            base: ['Vetiver Root', 'Oakmoss', 'Iso E Super'],
        },
    },
    {
        id: '5',
        number: 'N\u00B0. 06 \u2014 Amber Archive',
        displayName: 'AMBER DUST',
        name: 'AMBER',
        nameSub: 'DUST',
        category: 'Eau de Toilette',
        size: '100ML \u2014 Eau de Toilette',
        price: '\u20B910,500',
        priceValue: 10500,
        tagline: 'Sun-warmed resins softened by vanilla and pale tobacco.',
        description: 'Amber Dust leans transparent rather than heavy, layering benzoin, cedar, and dry vanilla over a lightly smoked base.',
        source: 'Captured in Delhi, IN',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAVre2q4xpS41hZCQY71JoFuKYVwDT4ZjnvyBJoB_VI8KLoZEXtCgpmjim_tcsCN8-anp1zwBFoIkdGUeYqE4F8p13h2J6tPCb5mHj-FYZmcXS1vc7XfaR2W3nQWwzKwYYiAq8tqUCURjdV0EKy4H3LjQ6yqt5M0xRGYO3OQ8K6_v8WxEJWGt_RAVpcRtZinp79aC8GibwDghE-77Vhd1ZJOqAOzsNeaQHjE_FEUz35uPNTkNErjAdxuxq0wbKemSw9C7s3eAlb--M',
        glowColor: 'bg-gradient-to-tr from-orange-50 to-transparent dark:from-orange-500/5 dark:to-orange-500/5',
        delay: '0.7s',
        notes: {
            top: ['Mandarin', 'Pink Pepper'],
            heart: ['Tobacco Leaf', 'Benzoin'],
            base: ['Amber Resin', 'Vanilla Husk', 'Cedarwood'],
        },
    },
    {
        id: '6',
        number: 'N\u00B0. 07 \u2014 Open Air',
        displayName: 'CEDAR SKY',
        name: 'CEDAR',
        nameSub: 'SKY',
        category: 'Eau Fraiche',
        size: '70ML \u2014 Eau Fraiche',
        price: '\u20B97,900',
        priceValue: 7900,
        tagline: 'A cold breeze through cedar boards, citrus peel, and distant rain.',
        description: 'Cedar Sky keeps the structure transparent, using aromatic woods and mineral musks to create lift without losing depth.',
        source: 'Captured in Shimla, IN',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAzSl0kZZnOAJ13PwKvHl1dIdWNOVyOJWPZGg2oSvt2rJyJFbYj3b0zBuV6H-8uilI9lKvxcokNLzAGWo3THWChfkDLs4agmpdXRRgQ3viOP4NNWINvKtlpaR-fNdVEh2cS7OUPThGtJEc-OxvGOq7oMTP97__1w3pMm4aN0ak4qWkR1Sut4V3guq7ufbbXDDZHxhIP7txJ5BimuFRRdI-DtX1dy2G9BEVFIo2wTKRLmhhlTsvzCMNyp-wohVYsyk4RtJDrCvNxhqE',
        glowColor: 'bg-gradient-to-tr from-blue-50 to-white dark:from-sky-500/5 dark:to-sky-500/5',
        delay: '0.8s',
        notes: {
            top: ['Grapefruit', 'Juniper'],
            heart: ['Lavender', 'Cypress'],
            base: ['Atlas Cedar', 'White Musk', 'Mineral Amber'],
        },
    },
];

export const featuredProducts = storeProducts.filter((product) =>
    ['1', '2', '3'].includes(product.id)
);

export const productById = Object.fromEntries(
    storeProducts.map((product) => [product.id, product])
) as Record<string, StoreProduct>;

export const discoverySetProduct = productById['discovery-set'];
