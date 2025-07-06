export interface Product {
    id: number;
    name: string;
    colors: {
        name: string;
        image: string;
    }[];
    sizes: {
        men: string;
        women: string;
    }[];
    price: number;
}

export const products: Product[] = [
    {
        id: 1,
        name: "FootBound X1",
        colors: [
            {
                name: "Black",
                image: "/assets/products/black-shoe.avif"
            },
            {
                name: "Pink",
                image: "/assets/products/pink-shoe.avif"
            },
            {
                name: "White",
                image: "/assets/products/white-shoe.avif"
            }
        ],
        sizes: [
            { men: "6", women: "7.5" },
            { men: "7", women: "8.5" },
            { men: "8", women: "9.5" },
            { men: "9", women: "10.5" },
            { men: "10", women: "11.5" },
            { men: "11", women: "12.5" },
            { men: "12", women: "13.5" }
        ],
        price: 129.99
    }
];
