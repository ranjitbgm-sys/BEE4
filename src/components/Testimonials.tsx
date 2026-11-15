import { FormEvent, useState } from 'react';
import { MessageSquarePlus, Star } from 'lucide-react';
import { Product, Testimonial, TestimonialErrors } from '../types';
import {
  calculateTestimonialSummary,
  validateTestimonialForm,
} from '../utils/storeLogic';

interface TestimonialsProps {
  testimonials: Testimonial[];
  products: Product[];
  onAddTestimonial: (testimonial: Testimonial) => void;
}

const RATING_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

export function Testimonials({
  testimonials,
  products,
  onAddTestimonial,
}: TestimonialsProps) {
  const defaultProduct = products[0]?.title ?? 'BEE4 Curated Find';

  const [customerName, setCustomerName] = useState('');
  const [cityOrRole, setCityOrRole] = useState('');
  const [productName, setProductName] = useState(defaultProduct);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [feedback, setFeedback] = useState('');
  const [errors, setErrors] = useState<TestimonialErrors>({});
  const [submittedNotice, setSubmittedNotice] = useState(false);

  const summary = calculateTestimonialSummary(testimonials);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validateTestimonialForm({
      customerName,
      cityOrRole,
      productName,
      rating,
      feedback,
    });

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmittedNotice(false);
      return;
    }

    const newEntry: Testimonial = {
      id: `test-${Date.now()}`,
      customerName: customerName.trim(),
      cityOrRole: cityOrRole.trim(),
      productName: productName.trim() || defaultProduct,
      rating,
      feedback: feedback.trim(),
      createdAt: new Date().toISOString(),
    };

    onAddTestimonial(newEntry);
    setCustomerName('');
    setCityOrRole('');
    setProductName(defaultProduct);
    setRating(5);
    setFeedback('');
    setErrors({});
    setSubmittedNotice(true);
  };

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-14 pb-16"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-500">
            Customer Feedback
          </p>
          <h2
            id="testimonials-heading"
            className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-zinc-900"
          >
            Trusted by Indian Shoppers &amp; Gift Buyers
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-subtle text-sm text-zinc-700 tabular-nums">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-zinc-900">
            {summary.averageRating.toFixed(1)} / 5
          </span>
          <span className="text-zinc-400" aria-hidden="true">
            ·
          </span>
          <span>
            {summary.count} verified {summary.count === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Customer Reviews List */}
        <div className="lg:col-span-7 space-y-4">
          {testimonials.length === 0 ? (
            <div className="p-8 rounded-3xl glass-surface text-sm text-zinc-600">
              No customer reviews yet. Be the first to share your experience with BEE4.
            </div>
          ) : (
            testimonials.map((item) => (
              <article
                key={item.id}
                className="p-5 sm:p-6 rounded-2xl glass-surface transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div
                    className="inline-flex items-center gap-1"
                    aria-label={`${item.rating} out of 5 stars`}
                  >
                    {RATING_LEVELS.map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= item.rating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-zinc-300'
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-zinc-500 tabular-nums">
                    {item.rating}.0 / 5
                  </span>
                </div>

                <p className="text-sm sm:text-base text-zinc-800 leading-relaxed">
                  &ldquo;{item.feedback}&rdquo;
                </p>

                <div className="mt-4 pt-3 border-t border-zinc-900/8 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600">
                  <span className="font-semibold text-zinc-900">{item.customerName}</span>
                  <span className="text-zinc-400" aria-hidden="true">
                    ·
                  </span>
                  <span>{item.cityOrRole}</span>
                  <span className="text-zinc-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-amber-700 font-medium">{item.productName}</span>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Share Feedback Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-5 p-6 rounded-3xl glass-surface space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full glass-orb flex items-center justify-center shrink-0">
              <MessageSquarePlus className="w-4 h-4 text-amber-700" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-zinc-900">
              Share Your Feedback
            </h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Bought a gift box, bottle, handbag, or desk find from BEE4? Tell fellow shoppers how
            it turned out.
          </p>

          {submittedNotice && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-50/85 backdrop-blur-md border border-emerald-200/80 text-xs text-emerald-800 font-medium"
            >
              Thank you for sharing your review. It is now live in the customer showcase.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
            <div>
              <label
                htmlFor="testimonial-name"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                Your Name *
              </label>
              <input
                id="testimonial-name"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errors.customerName) setErrors({ ...errors, customerName: undefined });
                }}
                placeholder="e.g. Kavya Menon"
                className="w-full h-11 px-3 rounded-xl glass-input text-sm text-zinc-900 focus:outline-none"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="testimonial-city"
                className="block text-xs font-medium text-zinc-700 mb-1"
              >
                City or Role *
              </label>
              <input
                id="testimonial-city"
                type="text"
                value={cityOrRole}
                onChange={(e) => {
                  setCityOrRole(e.target.value);
                  if (errors.cityOrRole) setErrors({ ...errors, cityOrRole: undefined });
                }}
                placeholder="e.g. Gift Buyer · Kochi"
                className="w-full h-11 px-3 rounded-xl glass-input text-sm text-zinc-900 focus:outline-none"
              />
              {errors.cityOrRole && (
                <p className="mt-1 text-xs text-red-600">{errors.cityOrRole}</p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="testimonial-product"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              Product Purchased
            </label>
            <select
              id="testimonial-product"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full h-11 px-3 rounded-xl glass-input text-sm text-zinc-900 focus:outline-none"
            >
              {products.map((product) => (
                <option key={product.id} value={product.title}>
                  {product.title}
                </option>
              ))}
              <option value="BEE4 Curated Gift Order">BEE4 Curated Gift Order</option>
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-700 mb-1.5">
              Your Rating
            </span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Select star rating">
              {RATING_LEVELS.map((star) => {
                const selected = star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} out of 5 stars`}
                    aria-pressed={rating === star}
                    className="w-11 h-11 rounded-xl glass-btn-secondary inline-flex items-center justify-center transition-all"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        selected ? 'fill-amber-500 text-amber-500' : 'text-zinc-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-semibold text-zinc-700 tabular-nums">
                {rating}.0 / 5
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="testimonial-feedback"
              className="block text-xs font-medium text-zinc-700 mb-1"
            >
              Your Review *
            </label>
            <textarea
              id="testimonial-feedback"
              rows={3}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (errors.feedback) setErrors({ ...errors, feedback: undefined });
              }}
              placeholder="Share what you liked about the build quality, packaging, or gifting experience..."
              className="w-full p-3 rounded-xl glass-input text-sm text-zinc-900 focus:outline-none"
            />
            {errors.feedback && (
              <p className="mt-1 text-xs text-red-600">{errors.feedback}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full h-11 rounded-xl glass-btn-ink text-white text-sm font-semibold transition-all"
          >
            Post Feedback
          </button>
        </form>
      </div>
    </section>
  );
}
