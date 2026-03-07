import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from './config';
import { stampCreate, stampUpdate } from '../timestamps';
import { PricingItem, PricingItemSchema } from '../types';

export const PRICING_COLLECTION = 'pricing';

export class PricingService {
    static async getPricingItem(id: string): Promise<PricingItem | null> {
        const docRef = doc(db, PRICING_COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return PricingItemSchema.parse({ id: snapshot.id, ...snapshot.data() });
    }

    static async getAllPricingItems(): Promise<PricingItem[]> {
        const q = query(collection(db, PRICING_COLLECTION), orderBy("id"));
        const smt = await getDocs(q);
        return smt.docs.map(doc => PricingItemSchema.parse({ id: doc.id, ...doc.data() }));
    }

    static async createPricingItem(item: Omit<PricingItem, 'id'> & { id: string }): Promise<PricingItem> {
        const docRef = doc(db, PRICING_COLLECTION, item.id);
        const payload = stampCreate(item);
        await setDoc(docRef, payload);
        return PricingItemSchema.parse({ ...payload, id: docRef.id });
    }

    static async updatePricingItem(id: string, updates: Partial<PricingItem>): Promise<PricingItem> {
        const docRef = doc(db, PRICING_COLLECTION, id);
        const payload = stampUpdate(updates);
        await setDoc(docRef, payload, { merge: true });
        return this.getPricingItem(id) as Promise<PricingItem>;
    }

    static async deletePricingItem(id: string): Promise<void> {
        const docRef = doc(db, PRICING_COLLECTION, id);
        await deleteDoc(docRef);
    }
}
