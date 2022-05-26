import React, { useEffect, useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CheckoutForm = ({ data }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const { _id, price, name, email } = data;

  useEffect(() => {
    fetch('https://localhost:5000/create-payment-intent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${localStorage.getItem('accessToken')}`
      },
      body: JSON.stringify({ price })
    })
      .then(res => res.json())
      .then(data => {
        console.log(data);

        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      });

  }, [price])

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const card = elements.getElement(CardElement);

    if (card === null) {
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card
    });

    setCardError(error?.message || '')
    setSuccess('');
    setProcessing(true);
    // confirm card payment
    const { paymentIntent, error: intentError } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: card,
          billing_details: {
            name: name,
            email: email
          },
        },
      },
    );

    if (intentError) {
      setCardError(intentError?.message);
      setProcessing(false);
    }
    else {
      setCardError('');
      setTransactionId(paymentIntent.id);
      console.log(paymentIntent);
      setSuccess('Congrats! Your payment is completed.')

      //store payment on database
      const payment = {
        orders: _id,
        transactionId: paymentIntent.id
      }
      fetch(`https://localhost:5000/orders/${_id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(payment)
      }).then(res => res.json())
        .then(data => {
          setProcessing(false);
          console.log(data);
        })

    }
  }
  return (
    <>
      <form className='px-5' onSubmit={handleSubmit}>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
        <button className='btn btn-success btn-sm mt-4 mb-10' type="submit" disabled={!stripe || !clientSecret || success}>
          Pay
        </button>
      </form>
      {
        cardError && <p className='text-red-500'>{cardError}</p>
      }
      {
        success && <div className='text-green-500'>
          <p>{success}  </p>
          <p>Your transaction Id: <span className="text-orange-500 font-bold">{transactionId}</span> </p>
        </div>
      }
    </>
  );
};

export default CheckoutForm;