# React Query with Firestore Data Fetching Strategies

This walkthrough explains how to implement data fetching strategies using React Query with Firebase Firestore, comparing static one-time fetches with real-time listeners.

## Real-time (`onSnapshot`) vs. Static (`getDocs`)

When building applications with Firestore, there are two primary approaches to retrieving data:
1. **Static Data Fetching:** Making a one-time request (using methods like `getDocs` or `getDoc`) to retrieve the current state of a document or collection.
2. **Real-time Subscriptions:** Establishing a persistent listener (using `onSnapshot`) that pushes updates to the client whenever the data changes on the server.

Both approaches are valid, but they serve different use cases and integrate differently with React Query.

### 1. Static fetching with `useQuery`

Static fetching is the standard use case for React Query. It excels here because it manages caching, background refetching (e.g., when the window regains focus), and pagination.

**Implementation Example:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['equipment'],
  queryFn: EquipmentService.getAllEquipment, // Under the hood, this calls `getDocs(collectionRef)`
  staleTime: 1000 * 60 * 5, // Data is considered fresh for 5 minutes
});
```

**Pros:**
* Simpler mental model.
* Reduces unnecessary reads (you only pay for Firestore reads when a fresh fetch occurs).
* Standard React Query features (deduplication, `staleTime`, `refetchInterval`) work out of the box.

**Cons:**
* Data might be briefly out of sync if another client updates the database.

### 2. Real-time Listeners with `useQueryClient`

While React Query is designed for asynchronous promise-based data fetching, it works beautifully with real-time listeners like `onSnapshot`.

Instead of relying on the `queryFn` to continuously fetch data, you establish the `onSnapshot` listener in a standard `useEffect`, and push the updates directly into React Query's cache using `queryClient.setQueryData`.

**Implementation Example:**
```typescript
// Inside your custom hook:
const queryClient = useQueryClient();

useEffect(() => {
    // Set up the listener
    const unsubscribe = onSnapshot(query(collection(db, 'equipment')), (snapshot) => {
        const newData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Push the update directly into the cache. 
        // Any component using `useQuery({ queryKey: ['equipment'] })` will instantly re-render.
        queryClient.setQueryData(['equipment'], newData);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
}, [queryClient]);
```

**Pros:**
* The UI is always perfectly in sync with the database across all clients.
* Excellent for real-time collaboration or interactive dashboards.

**Cons:**
* Can be more expensive (Firestore bills by the number of documents read, and listeners can read a lot if updates are frequent).
* Slightly more complex hook setup. You must carefully manage the `unsubscribe` function to prevent memory leaks and redundant listeners.

### Which to Choose?

* **Default to Static (`getDocs`):** For lists of products, user profiles, or configuration settings (like BOM Rules), standard static fetches with sensible `staleTime` values offer the best balance of user experience and cost.
* **Use Real-time (`onSnapshot`):** For chat messages, active collaborative sessions, or deployment status trackers where instant updates are critical.

## Optimistic Updates

When performing actions (mutations) like adding or modifying data, waiting for the Firestore round-trip can make the app feel sluggish. React Query's `useMutation` hook supports "Optimistic Updates".

This pattern immediately changes the React Query cache as if the mutation succeeded. If the actual network request fails, React Query can automatically roll back the cache to its previous state using the `onMutate` and `onError` callbacks.

Check the provided `src/hooks/useMutateEquipment.ts` for a complete example of this pattern.
